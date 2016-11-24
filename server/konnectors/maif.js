/**
* MAIF Cozy's konnector
*/

'use strict';

const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const toQueryString = require('querystring').stringify;

const cozydb = require('cozydb');

const localization = require('../lib/localization_manager');
const NotifHelper = require('cozy-notifications-helper');
const notifHelper = new NotifHelper('konnectors');

const factory = require('../lib/base_konnector');

const env = "prod"; //dev / pprod / prod

var connect_url, apikey, info_url, client_id, secret;

switch(env){
  case "dev":
    connect_url = "http://connect-dev-d.maif.local/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
  case "pprod":
    // connect_url = "http://connect-maiffr-pprodcorr.maif.local/connect/";
    connect_url = "https://connectbuild.maif.fr/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "https://openapiweb-build.maif.fr/ppcor/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
  case "prod":
    connect_url = "https://connect.maif.fr/connect";
    apikey = "eeafd0bd-a921-420e-91ce-3b52ee5807e8";
    info_url = "https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "2921ebd6-5599-4fa6-a533-0537fac62cfe";
    secret = "Z_-AMVTppsgj_F9tRLXfwUm6Wdq8OOv5a4ydDYzvbhFjMcp8aM90D0sdNp2kdaEczeGH_qYZhhd9JIzWkoWdGw";
  break;
  default:
    connect_url = "http://connect-dev-d.maif.local/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
}

const scope = "openid+profile+offline_access";
const type = "code";
var state = "";
var nonce = "";

if(state == ""){
  state = generateUUID();
}

if(nonce == ""){
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

  /*
  description: 'konnector description MAIF',
  customView: `<h5>Connectez-vous pour récupérer vos données</h5>
  <button id="connect-maif" class="btn"
    onclick="window.open('${getConnectUrl()}' + '&redirect_uri=' +
        document.location.origin + '/apps/konnectors/public/getCode',
        'MaifConnect', 'width=800,height=800')
       return false;"
       >Connexion</button><br /> <br />
       Vous pouvez définir une fréquence d'importation automatique des données.
        Elle n'est pas obligatoire mais si vous souhaitez la faire, une mise à jour journalière est recommandée.
       `,
*/
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
function getConnectUrl(){
  var base_url = connect_url + "/authorize?";
  return base_url + "response_type=" + type + "&client_id=" + client_id + "&scope=" + scope + "&state=" + state + "&nonce=" + nonce;
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

  let payload = {};

  var b64client = new Buffer(client_id+':'+secret).toString('base64');

  cozydb.api.getCozyDomain((err, domain) => {
    // if(domain.indexOf("localhost") != -1){ //contains localhost, transform https to http
    //   domain = domain.replace("https", "http");
    // }

    let path = requiredFields.redirect_path.split('?')[0];
    if (path[0] === '/') {
      path = path.slice(1);
    }
    var url_redirect = domain + path;
    var options = {
      url: connect_url+"/token",
      jar: true,
      method: 'POST',
      headers: {
        Authorization: "Basic " +b64client
      },
      form:{
        grant_type: "authorization_code",
        code: requiredFields.code,
        state: state,
        nonce :nonce,
        redirect_uri :url_redirect
      }
    };
    connecteur.logger.info(options);
    request(options, (err, response, body) =>{
      try {

        JSON.parse(body);
      } catch (e) {
        err = "error";
      }
      if(err != null){
        connecteur.logger.error(err);
        callback("Erreur lors de la récupération des données.");
      }
      else{
        if(JSON.parse(body).id_token == undefined){
          connecteur.logger.error(err);
          callback("Erreur lors de la récupération des données.");
        }
        else{
          var json_token = JSON.parse(body);
          var token = json_token.id_token;
          var token_refresh = json_token.refresh_token;
          getToken(token, token_refresh, callback);
        }
      }
    }, false);
  });
};


function updateOrCreateMaifUser(callback) {
  MaifUser.first(function(err, maifUser){
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
function getToken(token, token_refresh, callback){
  const payload = {password: token_refresh};

  updateOrCreateMaifUser(function(err, maifUser){
    maifUser.updateAttributes(payload, (err) => {
        getData(token, callback);
    });
  });
}

/**
* function called after getToken
* sends get request with token to get JSON data in return
*/
function getData(token, callback){
  MaifUser.first((err, maifuser) => {

    var options = {
      url: info_url,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: "Bearer " +token
      }
    };

    request(options, (err, response, body) =>{
      try {
        JSON.parse(body);
      } catch (e) {
        err = "error";
      }
      if(err != null){
        sendNotification('data retrieved failed', 'konnectors/konnector/maif');
        callback(err);
      }
      else{
        moment.locale('fr');
        var import_date = moment().format('LLL');
        var payload = {profile: JSON.parse(body), 'date': import_date};

        maifuser.updateAttributes(payload, (err) => { //mise à jour du maifuser en base en insérant le token
          sendNotification('data retrieved', 'mes-infos-maif');
          callback();
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
  MaifUser.first((err, maifuser) => {
    var token_valid = true;
    if(maifuser != undefined){
        var token = maifuser['password'];
      if(token != undefined){
        var b64client = new Buffer(client_id+':'+secret).toString('base64');
        var options = {
          url: connect_url+"/token",
          jar: true,
          method: 'POST',
          headers: {
            Authorization: "Basic " +b64client
          },
          form:{
            grant_type: "refresh_token",
            refresh_token: token,
          }
        };
        var data = {
          Header : "Authorization: Basic "+b64client,
          Data : "grant_type=refresh_token&refresh=" + token
        };
        request(options, (err, response, body) => {
          try {
            JSON.parse(body);
          } catch (e) {
            err = "error";
          }
          if(err != null){ //refresh token not valid anymore
            sendNotification('refresh token not valid', 'konnectors/konnector/maif');
            next(err);
          }
          else{
            var json_token = JSON.parse(body);
            var token = json_token.id_token;
            var token_refresh = json_token.refresh_token;
            getToken(token, token_refresh, next);
          }
        }, false);
      }
      else{
        token_valid = false;
      }
    }
    else{
      token_valid = false
    }
    if(!token_valid){
      // Maybe we have no token yet !
      getCode(requiredFields, function(err) {
        if (err) {
          sendNotification('refresh token not valid', 'konnectors/konnector/maif');
          next(err);
        } else {
          next();
        }

      })
    }
  });
}

/**
* Display a notification in Cozy
* code : code of the message to send
* appToOpen : Link to the app that will be opened on notification's click
*/
function sendNotification(code, appToOpen){
  code = code == undefined ? "" : code;
  appToOpen = appToOpen == undefined ? 'konnectors/konnector/maif' : appToOpen;
  var notifContent = localization.t(code, {});
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
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};