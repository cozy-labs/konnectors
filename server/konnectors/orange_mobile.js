'use strict';

const async = require('async');
const request = require('request');
const moment = require('moment');
const cozydb = require('cozydb');

const baseKonnector = require('../lib/base_konnector');
const updateOrCreate = require('../lib/update_or_create');

const API_ROOT = 'https://mesinfos.orange-labs.fr';

const logger = require('printit')({
  prefix: 'Orange Mobile',
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

const PhoneCommunicationLog = cozydb.getModel('PhoneCommunicationLog', {
  docType: String,
  docTypeVersion: String,
  timestamp: String,
  subscriber: String,
  peer: String,
  chipCount: Number,
  chipType: String,
  type: String,
  imsi: String,
  imei: String,
  latitude: Number,
  longitude: Number,
});

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Orange Mobile',
  slug: 'orange_mobile',
  connectUrl: 'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: 'hidden',
  },

  models: [GeoPoint, PhoneCommunicationLog],

  init: () => {
    async.each(this.models, (model, cb) => {
      model.defineRequest('all', cozydb.defaultRequests.all, cb);
    }, (err) => {
      if (err) {
        this.logger.error(err);
      }
    });
  },

  fetchOperations: [
    downloadGeoloc,
    // downloadCRA,
    // display,
    updateOrCreate(logger, GeoPoint, ['msisdn', 'timestamp']),
    // updateOrCreate(logger, PhoneCommunicationLog, ['subscriber', 'timestamp']),
  ],

});


function downloadGeoloc(requiredFields, entries, data, next) {
  connector.logger.info('Downloading geoloc data from Orange...');

  // TODO: something coherent with the orange collect. Overlaping doesn't matter.
  let uri = `${API_ROOT}/data/geoloc`;
  if (requiredFields.lastSuccess) {
    const since = moment(requiredFields.lastSuccess).add(-1, 'days');
    uri += `?start=${since.format('YYYY-MM-DDThh:mm:ss')}`;
  }
  request.get(uri,
    { auth: { bearer: requiredFields.access_token }, json: true },
    (err, res, body) => {
      if (res.statusCode != 200) {
        err = `${res.statusCode} - ${res.statusMessage} ${err || ''}`;
        connector.logger.error(body);
      }

      if (err) {
        connector.logger.error(`Download failed: ${err}`);
      } else {
        connector.logger.info('Download succeeded.');

        entries.geopoint = body.filter(point => !point.err)
        .map(point => (
          {
            docType: 'GeoPoint',
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

// TODO: wait for definiv API format to activate this.
// function downloadCRA(requiredFields, entries, data, next) {
//   connector.logger.info('Downloading CRA data from Orange...');

//   //TODO: something coherent with the orange collect. Overlaping doesn't matter.
//   let uri = `${API_ROOT}/data/cra`;
//   if (requiredFields.lastSuccess) {
//     let since = moment(requiredFields.lastSuccess).add(-1, 'month');
//     uri += `?start=${since.format('YYYY-MM-DDThh:mm:ss')}`;
//   }
//   request.get(uri,
//     { auth: { bearer: requiredFields.access_token }, json: true },
//     (err, res, body) => {
//       if (res.statusCode != 200) {
//         err = `${res.statusCode} - ${res.statusMessage} ${err || ''}`
//         connector.logger.error(body);
//       }

//       if (err) {
//         connector.logger.error(`Download CRA failed: ${err}`);
//       } else {
//         connector.logger.info('Download CRA succeeded.');

//         entries.PhoneCommunicationLog = body.filter(call => !call.err)
//         .map((point) => (
//           {
//             docType: "PhoneCommunicationLog",
//             docTypeVersion: connector.doctypeVersion,
//           }));
//       }
//       next(err);
//     });
// }

// TODO: remove this tool.
// function display(requiredFields, entries, data, next) {
//   connector.logger.info(JSON.stringify(entries, null, 2));
//   connector.logger.info(JSON.stringify(data, null, 2));

//   next();
// }
