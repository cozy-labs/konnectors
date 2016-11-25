/**
* MAIF Cozy's konnector
*/

'use strict';

const request = require('request');
const moment = require('moment');
const cozydb = require('cozydb');
const NotifHelper = require('cozy-notifications-helper');

const factory = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const notifHelper = new NotifHelper('konnectors');

const env = 'prod'; // dev / pprod / prod

let connectUrl;
let apikey;
let infoUrl;
let clientId;
let secret;

switch (env) {
  case 'dev':
    connectUrl = 'http://connect-dev-d.maif.local/connect';
    apikey = '1f3299b5-967c-46ae-9bbe-94c22051da5e';
    infoUrl = `http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey=${apikey}`;
    clientId = 'eea55366-14b5-4609-ac4d-45f6abfad351';
    secret = 'AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4';
    break;
  case 'pprod':
    // connectUrl = 'http://connect-maiffr-pprodcorr.maif.local/connect/';
    connectUrl = 'https://connectbuild.maif.fr/connect';
    apikey = '1f3299b5-967c-46ae-9bbe-94c22051da5e';
    infoUrl = `https://openapiweb-build.maif.fr/ppcor/cozy/v1/mes_infos?apikey=${apikey}`;
    clientId = 'eea55366-14b5-4609-ac4d-45f6abfad351';
    secret = 'AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4';
    break;
  case 'prod':
    connectUrl = 'https://connect.maif.fr/connect';
    apikey = 'eeafd0bd-a921-420e-91ce-3b52ee5807e8';
    infoUrl = `https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey=${apikey}`;
    clientId = '2921ebd6-5599-4fa6-a533-0537fac62cfe';
    secret = 'Z_-AMVTppsgj_F9tRLXfwUm6Wdq8OOv5a4ydDYzvbhFjMcp8aM90D0sdNp2kdaEczeGH_qYZhhd9JIzWkoWdGw';
    break;
  default:
    connectUrl = 'http://connect-dev-d.maif.local/connect';
    apikey = '1f3299b5-967c-46ae-9bbe-94c22051da5e';
    infoUrl = `http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey=${apikey}`;
    clientId = 'eea55366-14b5-4609-ac4d-45f6abfad351';
    secret = 'AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4';
    break;
}

const scope = 'openid+profile+offline_access';
const type = 'code';
const b64Client = new Buffer(`${clientId}:${secret}`).toString('base64');
let state = '';
let nonce = '';

if (state === '') {
  state = generateUUID();
}

if (nonce === '') {
  nonce = generateUUID();
}

const MaifUser = cozydb.getModel('MaifUser', {
  password: String,
  profile: Object,
  date: String,
});

const connecteur = module.exports = factory.createNew({
  name: 'MAIF',
  slug: 'maif',
  connectUrl: `${getConnectUrl()}&redirect_uri=`,

  fields: {
    code: 'hidden', // To get the Auth code returned on the redirection.
    redirect_path: 'hidden',
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
  if (!(requiredFields.redirect_path && requiredFields.code)) {
    return callback('No auth code.');
  }

  cozydb.api.getCozyDomain((err, domain) => {
    // if(domain.indexOf('localhost') != -1){ //contains localhost, transform https to http
    //   domain = domain.replace('https', 'http');
    // }

    let path = requiredFields.redirect_path.split('?')[0];
    if (path[0] === '/') {
      path = path.slice(1);
    }
    const urlRedirect = `${domain}${path}`;
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
      try {
        JSON.parse(body);
      } catch (e) {
        err = 'error';
      }

      if (err != null) {
        connecteur.logger.error(err);
        callback('Erreur lors de la récupération des données.');
      } else if (JSON.parse(body).id_token === undefined) {
        connecteur.logger.error(err);
        callback('Erreur lors de la récupération des données.');
      } else {
        const jsonToken = JSON.parse(body);
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
      try {
        JSON.parse(body);
      } catch (e) {
        err = 'error';
      }
      if (err != null) {
        sendNotification('data retrieved failed', 'konnectors/konnector/maif');
        callback(err);
      } else {
        moment.locale('fr');
        const importDate = moment().format('LLL');
        const payload = { profile: JSON.parse(body), date: importDate };

        maifuser.updateAttributes(payload, (err) => { // mise à jour du maifuser en base en insérant le token
          sendNotification('data retrieved', 'mes-infos-maif');
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
    if (maifUser !== undefined) {
      const token = maifUser.password;
      if (token !== undefined) {
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
          try {
            JSON.parse(body);
          } catch (e) {
            err = 'error';
          }
          if (err != null) { // refresh token not valid anymore
            sendNotification('refresh token not valid', 'konnectors/konnector/maif');
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
          sendNotification('refresh token not valid', 'konnectors/konnector/maif');
          next(err);
        } else {
          next();
        }
      });
    }
  });
}

/**
* Display a notification in Cozy
* code : code of the message to send
* appToOpen : Link to the app that will be opened on notification's click
*/
function sendNotification(code, appToOpen) {
  code = code === undefined ? '' : code;
  appToOpen = appToOpen === undefined ? 'konnectors/konnector/maif' : appToOpen;
  const notifContent = localization.t(code, {});
  notifHelper.createTemporary({
    app: 'konnectors',
    text: notifContent,
    resource: {
      app: appToOpen,
    }
  });
}

/**
* generate UUID for nonce and state parameters
*/
function generateUUID() {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}
