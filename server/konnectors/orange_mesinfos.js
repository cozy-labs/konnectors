  'use strict';

const async = require('async');
const request = require('request');
const moment = require('moment');
const toQueryString = require('querystring').stringify;
const cozydb = require('cozydb');

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');
const updateOrCreate = require('../lib/update_or_create');

const API_ROOT = 'https://mesinfos.orange-labs.fr';

const logger = require('printit')({
  prefix: 'Orange MesInfos',
  date: true
});


const GeoPoint = cozydb.getModel('GeoPoint', {
  docTypeVersion: String,
  msisdn: String,
  timestamp: String,
  latitude: Number,
  longitude: Number,
  radius: Number,
});

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Orange MesInfos',
  slug: 'orange_mesinfos',
  connectUrl:  'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: 'hidden',
  },

  models: [GeoPoint],

  fetchOperations: [
    //downloadData,
    downloadGeoloc,
    display,
    updateOrCreate(logger, GeoPoint, ['msisdn', 'timestamp']),
  ],

});


function downloadData(requiredFields, entries, data, next) {
  connector.logger.info('Downloading events data from Facebook...');

  request.get('https://mesinfos.orange-labs.fr/data', { auth: { bearer: requiredFields.access_token }},
    (err, res, body) => {
      if (err) {
        connector.logger.error(`Download failed: ${err.msg}`);
      } else {
        connector.logger.info('Download succeeded.');
        connector.logger.info(body);
      }
      next(err);
    });
}

function downloadGeoloc(requiredFields, entries, data, next) {
  connector.logger.info('Downloading geoloc data from Orange...');

  console.log(requiredFields);
  //TODO: something coherent with the orange collect. Overlaping doesn't matter.
  let uri = `${API_ROOT}/data/geoloc`;
  if (requiredFields.lastSuccess) {
    console.log('toto');
    let since = moment(requiredFields.lastSuccess).add(-2, 'hours');
    uri += `?start=${since.format('YYYY-MM-DDThh:mm:ss')}`;
  }
  console.log(uri);
  request.get(uri,
    { auth: { bearer: requiredFields.access_token }, json: true },
    (err, res, body) => {
      if (res.statusCode != 200) {
        err = `${res.statusCode} - ${res.statusMessage} ${err || ''}`
        connector.logger.error(body);
      }

      if (err) {
        connector.logger.error(`Download failed: ${err}`);
      } else {
        connector.logger.info('Download succeeded.');
        connector.logger.info(body);

        entries.geopoint = body.filter(point => !point.err)
        .map((point) => (
          {
            docType: "GeoPoint",
            docTypeVersion: connector.doctypeVersion,
            msisdn: point.msisdn,
            timestamp: point.ts,
            longitude: point.loc[0],
            latitude: point.loc[1],
            radius: point.rad,
          }));
      }
      next(err);
    });
}

function display(requiredFields, entries, data, next) {
  connector.logger.info(JSON.stringify(entries, null, 2));
  connector.logger.info(JSON.stringify(data, null, 2));

  next();
}
