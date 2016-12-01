'use strict';

const async = require('async');
const request = require('request');
const moment = require('moment');
const cozydb = require('cozydb');

const baseKonnector = require('../lib/base_konnector');
const updateOrCreate = require('../lib/update_or_create');

const GeoPoint = require('../models/geopoint');
const PhoneCommunicationLog = require('../models/phonecommunicationlog');

const API_ROOT = 'https://mesinfos.orange-labs.fr';

const logger = require('printit')({
  prefix: 'Orange Mobile',
  date: true
});


/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Orange Mobile',
  connectUrl: 'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: 'hidden',
    lastGeoPoint: 'hidden',
    lastPhoneCommunicationLog: 'hidden',
  },

  models: [GeoPoint, PhoneCommunicationLog],

  fetchOperations: [
    downloadGeoloc,
    downloadCRA,
    //   function(requiredFields, entries, data, next) {
    // let uri = `${API_ROOT}/data/loc`;

    // request.get(uri,
    //   { auth: { bearer: requiredFields.access_token }, json: true },
    //   (err, res, body) => {
    //     console.log(body);
    //   });
    // } ,
    // display,
    updateOrCreate(logger, GeoPoint, ['msisdn', 'timestamp']),
    updateOrCreate(logger, PhoneCommunicationLog, ['msisdn', 'timestamp']),
    saveFieldsInKonnector,
  ],

});

function requestOrange(uri, token, callback) {
  connector.logger.info(uri);

  request.get(uri, { auth: { bearer: token }, json: true }, (err, res, body) => {
    if (res.statusCode != 200) {
      err = `${res.statusCode} - ${res.statusMessage} ${err || ''}`;
      connector.logger.error(body);
    }

    if (err) {
      connector.logger.error(`Download failed: ${err}`);
      return callback(err);
    }
    callback(null, body);
  });
}

function downloadGeoloc(requiredFields, entries, data, next) {
  connector.logger.info('Downloading geoloc data from Orange...');

  let uri = `${API_ROOT}/data/geoloc`;
  if (requiredFields.lastGeoPoint) {
    uri += `?start=${requiredFields.lastGeoPoint.slice(0, 19)}`;
  }

  requestOrange(uri, requiredFields.access_token, (err, body) => {
    if (err) { return next(err); }

    entries.geopoints = [];
    body.forEach((point) => {
      if (point.ts && requiredFields.lastGeoPoint < point.ts) {
        requiredFields.lastGeoPoint = point.ts ;
      }
      if (point.err) { return; }

      entries.geopoints.push({
        docType: 'GeoPoint',
        docTypeVersion: connector.doctypeVersion,
        msisdn: point.msisdn,
        timestamp: point.ts,
        longitude: point.loc[0],
        latitude: point.loc[1],
        radius: point.rad,
      });
    });

    next();
  });
}

function downloadCRA(requiredFields, entries, data, next) {
  connector.logger.info('Downloading CRA data from Orange...');

  let uri = `${API_ROOT}/data/cra`;
  if (requiredFields.lastPhoneCommunicationLog) {
    uri += `?start=${requiredFields.lastPhoneCommunicationLog.slice(0, 19)}`;
  }

  requestOrange(uri, requiredFields.access_token, (err, body) => {
    if (err) { return next(err); }
    connector.logger.info(body);

    entries.phonecommunicationlogs = [];
    body.forEach((cra) => {
      if (cra.time && requiredFields.lastPhoneCommunicationLog < cra.time) {
        requiredFields.lastPhoneCommunicationLog = cra.time ;
      }
      if (cra.err) { return; }

      entries.phonecommunicationlogs.push({
        docType: 'PhoneCommunicationLog',
        docTypeVersion: connector.doctypeVersion,
        timestamp: cra.time,
        msisdn: cra.msisdn,
        partner: cra.partner,
        length: cra.units,
        chipType: cra.typ_units,
        longitude: cra.loc ? cra.loc[0] : undefined,
        latitude: cra.loc ? cra.loc[1] : undefined,
        networkType: cra.net_lbl,
        type: cra.desc,
        endCause: cra.end_cause,
      });

      next();
    });
  });
}



// Save konnector's fieldValues during fetch process.
function saveFieldsInKonnector(requiredFields, entries, data, next) {
  connector.logger.info('saveFieldsInKonnector');

  // Disable eslint because we can't require models/konnector at the top
  // of this file (or Konnector will be empty). It's because in the require
  // tree of models/konnector, there is the current file.
  //eslint-disable-next-line
  const Konnector = require('../models/konnector');

  Konnector.all((err, konnectors) => {
    if (err) {
      connector.logger.error(err);
      return next('request error');
    }

    const konnector = konnectors.filter(k => k.slug === connector.slug)[0];
    const accounts = konnector.accounts;
    const index = accounts.findIndex(account =>
        account.access_token === requiredFields.access_token);
    accounts[index] = requiredFields;
    konnector.updateFieldValues({ accounts: accounts }, next);
  });
}

// TODO: remove this tool.
// function display(requiredFields, entries, data, next) {
//   connector.logger.info(JSON.stringify(entries, null, 2));
//   connector.logger.info(JSON.stringify(data, null, 2));

//   next();
// }
