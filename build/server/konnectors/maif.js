/**
* MAIF Cozy's konnector
*/

'use strict';

var request = require('request');
var moment = require('moment');
var uuid = require('uuid');
var cozydb = require('cozydb');
var factory = require('../lib/base_konnector');

var connectUrl = 'https://connect.maif.fr/connect';
var apikey = 'eeafd0bd-a921-420e-91ce-3b52ee5807e8';
var infoUrl = 'https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey=' + apikey;
var clientId = '2921ebd6-5599-4fa6-a533-0537fac62cfe';
var secret = 'Z_-AMVTppsgj_F9tRLXfwUm6Wdq8OOv5a4ydDYzvbhFjMcp8aM90D0sdNp2kdaEczeGH_qYZhhd9JIzWkoWdGw';

var scope = 'openid+profile+offline_access';
var type = 'code';
var b64Client = new Buffer(clientId + ':' + secret).toString('base64');
var state = '';
var nonce = '';

if (state === '') {
  state = uuid();
}

if (nonce === '') {
  nonce = uuid();
}

var MaifUser = cozydb.getModel('MaifUser', {
  password: String, // The refresh token. TODO: move it in a konnector field

  // All the Maif data ( http://mesinfos.fing.org/cartographies/datapilote/ ).
  // TODO: split it in multiples documents. But it  should be synchronized with
  // one update of mes infos maif app.
  profile: Object,
  date: String });

var connecteur = module.exports = factory.createNew({
  name: 'MAIF',
  customView: '<%t konnector customview maif %>',
  connectUrl: getConnectUrl() + '&redirect_uri=',

  fields: {
    code: 'hidden', // To get the Auth code returned on the redirection.
    redirectPath: 'hidden'
  },

  models: [MaifUser],
  fetchOperations: [refreshToken]
});

/**
* return connection url with all params
*/
function getConnectUrl() {
  var baseUrl = connectUrl + '/authorize?';
  return baseUrl + 'response_type=' + type + '&client_id=' + clientId + '&scope=' + scope + '&state=' + state + '&nonce=' + nonce;
}

/**
* called with connection's callback.
* get code from data
* create or update user in db
* call post request to get token
*/
function getCode(requiredFields, callback) {
  if (!(requiredFields.redirectPath && requiredFields.code)) {
    return callback('token not found');
  }

  cozydb.api.getCozyDomain(function (err, domain) {
    // if(domain.indexOf('localhost') != -1){ //contains localhost, transform https to http
    //   domain = domain.replace('https', 'http');
    // }

    // TODO: redirectionURI reconstruction is not clean enough, and doesn't work
    // in dev mode.
    var path = requiredFields.redirectPath.split('?')[0];
    if (path[0] === '/') {
      path = path.slice(1);
    }
    var urlRedirect = domain + 'apps/konnectors/' + path;
    var options = {
      url: connectUrl + '/token',
      jar: true,
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + b64Client
      },
      form: {
        grant_type: 'authorization_code',
        code: requiredFields.code,
        state: state,
        nonce: nonce,
        redirect_uri: urlRedirect
      }
    };
    connecteur.logger.info(options);
    request(options, function (err, response, body) {
      if (err) {
        connecteur.logger.error(err);
        return callback('request error');
      }

      var jsonToken = null;
      try {
        jsonToken = JSON.parse(body);
      } catch (e) {
        err = 'parsing error';
      }

      if (err != null) {
        connecteur.logger.error(err);
        callback(err);
      } else if (jsonToken.id_token === undefined) {
        connecteur.logger.error('token not found');
        callback('token not found');
      } else {
        getToken(jsonToken.id_token, jsonToken.refresh_token, callback);
      }
    }, false);
  });
}

function updateOrCreateMaifUser(callback) {
  MaifUser.first(function (err, maifUser) {
    if (maifUser) {
      callback(null, maifUser);
    } else {
      MaifUser.create({}, callback);
    }
  });
}

/**
* function called when token returns
* update user's line in db with token_refresh
* call getData function
*/
function getToken(token, tokenRefresh, callback) {
  var payload = { password: tokenRefresh };

  updateOrCreateMaifUser(function (err, maifUser) {
    maifUser.updateAttributes(payload, function (err) {
      if (err) {
        return callback(err);
      }
      getData(token, callback);
    });
  });
}

/**
* function called after getToken
* sends get request with token to get JSON data in return
*/
function getData(token, callback) {
  MaifUser.first(function (err, maifuser) {
    var options = {
      url: infoUrl,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token
      }
    };

    request(options, function (err, response, body) {
      if (err) {
        connecteur.logger.error(err);
        return callback('request error');
      }

      try {
        JSON.parse(body);
      } catch (e) {
        err = 'parsing error';
      }
      if (err != null) {
        connecteur.logger.error(err);
        callback(err);
      } else {
        moment.locale('fr');
        var importDate = moment().format('LLL');
        var payload = { profile: JSON.parse(body), date: importDate };

        maifuser.updateAttributes(payload, function (err) {
          // mise à jour du maifuser en base en insérant le token
          callback(err);
        });
      }
    }, false);
  });
}

/**
* refreshToken function
* called at each scheduled import (every hour/day/week/month)
* get new token and refresh token
* call getToken with token and refresh token
*/
function refreshToken(requiredFields, entries, data, next) {
  MaifUser.first(function (err, maifUser) {
    var tokenValid = true;
    if (maifUser && !err) {
      var token = maifUser.password;
      if (token) {
        var options = {
          url: connectUrl + '/token',
          jar: true,
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + b64Client
          },
          form: {
            grant_type: 'refresh_token',
            refresh_token: token
          }
        };
        request(options, function (err, response, body) {
          if (err) {
            connecteur.logger.error(err);
            return next('request error');
          }
          try {
            JSON.parse(body);
          } catch (e) {
            err = 'parsing error';
          }
          if (err != null) {
            // refresh token not valid anymore
            connecteur.logger.error(err);
            next(err);
          } else {
            var jsonToken = JSON.parse(body);
            getToken(jsonToken.token, jsonToken.token_refresh, next);
          }
        }, false);
      } else {
        tokenValid = false;
      }
    } else {
      tokenValid = false;
    }
    if (!tokenValid) {
      // Maybe we have no token yet !
      getCode(requiredFields, function (err) {
        if (err) {
          connecteur.logger.error(err);
          next('token not found');
        } else {
          next();
        }
      });
    }
  });
}