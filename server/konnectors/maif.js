/**
* MAIF Cozy's konnector
*/

'use strict';

const request = require('request');
const moment = require('moment');
const uuid = require('uuid');
const cozydb = require('cozydb');
const factory = require('../lib/base_konnector');

const connectUrl = 'https://connect.maif.fr/connect';
const apikey = 'eeafd0bd-a921-420e-91ce-3b52ee5807e8';
const infoUrl = `https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey=${apikey}`;
const clientId = '2921ebd6-5599-4fa6-a533-0537fac62cfe';
const secret = 'Z_-AMVTppsgj_F9tRLXfwUm6Wdq8OOv5a4ydDYzvbhFjMcp8aM90D0sdNp2kdaEczeGH_qYZhhd9JIzWkoWdGw';

const scope = 'openid+profile+offline_access';
const type = 'code';
const b64Client = new Buffer(`${clientId}:${secret}`).toString('base64');
let state = '';
let nonce = '';

if (state === '') {
  state = uuid();
}

if (nonce === '') {
  nonce = uuid();
}

const MaifUser = cozydb.getModel('MaifUser', {
  password: String, // The refresh token. TODO: move it in a konnector field

  // All the Maif data ( http://mesinfos.fing.org/cartographies/datapilote/ ).
  // TODO: split it in multiples documents. But it  should be synchronized with
  // one update of mes infos maif app.
  profile: Object,
  date: String, // last update date TODO: use the one from konnector.
});

const connecteur = module.exports = factory.createNew({
  name: 'MAIF',
  customView: '<%t konnector customview maif %>',
  connectUrl: `${getConnectUrl()}&redirect_uri=`,

  fields: {
    code: 'hidden', // To get the Auth code returned on the redirection.
    redirectPath: 'hidden',
  },

  models: [MaifUser],
  fetchOperations: [
    refreshToken
  ]
});

/**
* return connection url with all params
*/
function getConnectUrl() {
  const baseUrl = `${connectUrl}/authorize?`;
  return `${baseUrl}response_type=${type}&client_id=${clientId}&scope=${scope}&state=${state}&nonce=${nonce}`;
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

  cozydb.api.getCozyDomain((err, domain) => {
    // if(domain.indexOf('localhost') != -1){ //contains localhost, transform https to http
    //   domain = domain.replace('https', 'http');
    // }

    // TODO: redirectionURI reconstruction is not clean enough, and doesn't work
    // in dev mode.
    let path = requiredFields.redirectPath.split('?')[0];
    if (path[0] === '/') {
      path = path.slice(1);
    }
    const urlRedirect = `${domain}apps/konnectors/${path}`;
    const options = {
      url: `${connectUrl}/token`,
      jar: true,
      method: 'POST',
      headers: {
        Authorization: `Basic ${b64Client}`
      },
      form: {
        grant_type: 'authorization_code',
        code: requiredFields.code,
        state,
        nonce,
        redirect_uri: urlRedirect
      }
    };
    connecteur.logger.info(options);
    request(options, (err, response, body) => {
      if (err) {
        connecteur.logger.error(err);
        return callback('request error');
      }

      let jsonToken = null;
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
  MaifUser.first((err, maifUser) => {
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
  const payload = { password: tokenRefresh };

  updateOrCreateMaifUser((err, maifUser) => {
    maifUser.updateAttributes(payload, (err) => {
      if (err) { return callback(err); }
      getData(token, callback);
    });
  });
}


/**
* function called after getToken
* sends get request with token to get JSON data in return
*/
function getData(token, callback) {
  MaifUser.first((err, maifuser) => {
    const options = {
      url: infoUrl,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    };

    request(options, (err, response, body) => {
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
        const importDate = moment().format('LLL');
        const payload = { profile: JSON.parse(body), date: importDate };

        maifuser.updateAttributes(payload, (err) => { // mise à jour du maifuser en base en insérant le token
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
  MaifUser.first((err, maifUser) => {
    let tokenValid = true;
    if (maifUser && !err) {
      const token = maifUser.password;
      if (token) {
        const options = {
          url: `${connectUrl}/token`,
          jar: true,
          method: 'POST',
          headers: {
            Authorization: `Basic ${b64Client}`,
          },
          form: {
            grant_type: 'refresh_token',
            refresh_token: token,
          }
        };
        request(options, (err, response, body) => {
          if (err) {
            connecteur.logger.error(err);
            return next('request error');
          }
          try {
            JSON.parse(body);
          } catch (e) {
            err = 'parsing error';
          }
          if (err != null) { // refresh token not valid anymore
            connecteur.logger.error(err);
            next(err);
          } else {
            const jsonToken = JSON.parse(body);
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
      getCode(requiredFields, (err) => {
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
