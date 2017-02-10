'use strict';

var request = require('request');
var localization = require('../lib/localization_manager');
var baseKonnector = require('../lib/base_konnector');
var updateOrCreate = require('../lib/update_or_create');

var GeoPoint = require('../models/geopoint');
var PhoneCommunicationLog = require('../models/phonecommunicationlog');

var API_ROOT = 'https://mesinfos.orange-labs.fr';

var logger = require('printit')({
  prefix: 'Orange Mobile',
  date: true
});

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
var connector = module.exports = baseKonnector.createNew({
  name: 'Orange Mobile',
  customView: '<%t konnector customview orange_mobile %>',

  connectUrl: 'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: {
      type: 'hidden'
    },
    lastGeoPoint: {
      type: 'hidden'
    },
    lastPhoneCommunicationLog: {
      type: 'hidden'
    }
  },
  dataType: ['msisdn', 'timestamp'],
  models: [GeoPoint, PhoneCommunicationLog],

  fetchOperations: [checkToken, downloadGeoloc, downloadCRA, updateOrCreate(logger, GeoPoint, ['msisdn', 'timestamp']), updateOrCreate(logger, PhoneCommunicationLog, ['msisdn', 'timestamp']), saveFieldsInKonnector, buildNotifContent]

});

function checkToken(requiredFields, entries, data, next) {
  var token = requiredFields.access_token;
  if (!token) {
    return next('token not found');
  }

  try {
    var payload = token.split('.')[1];
    payload = JSON.parse(new Buffer(payload, 'base64').toString());

    if (payload.token_type !== 'mobile') {
      connector.logger.error('Wronk token_type for this konnector: ' + payload.token_type);
      return next('not mobile token');
    }

    next();
  } catch (e) {
    connector.logger.error('Unexpected token format: ' + e);
    next('token not found');
  }
}

function requestOrange(uri, token, callback) {
  connector.logger.info(uri);

  request.get(uri, { auth: { bearer: token }, json: true }, function (err, res, body) {
    if (res.statusCode.toString() !== '200') {
      err = res.statusCode + ' - ' + res.statusMessage + ' ' + (err || '');
      connector.logger.error(body);
    }

    if (err) {
      connector.logger.error('Download failed: ' + err);
      return callback(err);
    }
    callback(null, body);
  });
}

function downloadGeoloc(requiredFields, entries, data, next) {
  connector.logger.info('Downloading geoloc data from Orange...');

  var uri = API_ROOT + '/data/loc';
  if (requiredFields.lastGeoPoint) {
    uri += '?start=' + requiredFields.lastGeoPoint.slice(0, 19);
  }

  requestOrange(uri, requiredFields.access_token, function (err, body) {
    if (err) {
      return next(err);
    }
    entries.geopoints = [];
    body.forEach(function (point) {
      if (point.ts && requiredFields.lastGeoPoint < point.ts) {
        requiredFields.lastGeoPoint = point.ts;
      }
      if (point.err) {
        return;
      }

      entries.geopoints.push({
        docType: 'GeoPoint',
        docTypeVersion: connector.docTypeVersion,
        msisdn: point.msisdn,
        timestamp: point.ts,
        longitude: point.loc[0],
        latitude: point.loc[1],
        radius: point.rad
      });
    });

    next();
  });
}

function downloadCRA(requiredFields, entries, data, next) {
  connector.logger.info('Downloading CRA data from Orange...');

  var uri = API_ROOT + '/data/cra';
  if (requiredFields.lastPhoneCommunicationLog) {
    uri += '?start=' + requiredFields.lastPhoneCommunicationLog.slice(0, 19);
  }

  requestOrange(uri, requiredFields.access_token, function (err, body) {
    if (err) {
      return next(err);
    }

    // map SMS_C for further concat in one SMS object.
    var smsCByTs = body.filter(function (cra) {
      return cra.desc.indexOf('SMS_C') === 0;
    }).reduce(function (agg, smsC) {
      agg[smsC.ts] = smsC;
      return agg;
    }, {});

    entries.phonecommunicationlogs = [];

    body.forEach(function (cra) {
      try {
        if (cra.time && requiredFields.lastPhoneCommunicationLog < cra.time) {
          requiredFields.lastPhoneCommunicationLog = cra.time;
        }
        if (cra.err || cra.desc.indexOf('SMS_C') === 0) {
          return;
        }

        if (cra.desc.indexOf('SMS ') === 0) {
          // Try to merge informations
          var smsC = smsCByTs[cra.ts];
          if (smsC) {
            cra.length = smsC.units;
            cra.chipType = 'c';
          }
        }

        entries.phonecommunicationlogs.push({
          docType: 'PhoneCommunicationLog',
          docTypeVersion: connector.docTypeVersion,
          timestamp: cra.time,
          msisdn: cra.msisdn,
          partner: cra.partner,
          length: cra.units,
          chipType: cra.typ_units,
          longitude: cra.loc ? cra.loc[0] : undefined,
          latitude: cra.loc ? cra.loc[1] : undefined,
          networkType: cra.net_lbl,
          type: cra.desc,
          endCause: cra.end_cause
        });
      } catch (e) {
        connector.logger.error('While parsing CRA.');
        connector.logger.error(e);
      }
    });
    next();
  });
}

// Save konnector's fieldValues during fetch process.
function saveFieldsInKonnector(requiredFields, entries, data, next) {
  connector.logger.info('saveFieldsInKonnector');

  // Disable eslint because we can't require models/konnector at the top
  // of this file (or Konnector will be empty). It's because in the require
  // tree of models/konnector, there is the current file.
  //eslint-disable-next-line
  var Konnector = require('../models/konnector');

  Konnector.get(connector.slug, function (err, konnector) {
    if (err) {
      connector.logger.error(err);
      return next('internal error');
    }

    var accounts = konnector.accounts;
    var index = accounts.findIndex(function (account) {
      return account.access_token === requiredFields.access_token;
    });
    accounts[index] = requiredFields;
    konnector.updateFieldValues({ accounts: accounts }, next);
  });
}

function buildNotifContent(requiredFields, entries, data, next) {
  // data.updated: we don't speak about update, because we don't now if the
  // update actually changes the data or not.

  // Signal all add of document.
  var addedList = [];
  Object.keys(data.created).forEach(function (docsName) {
    var count = data.created[docsName];
    if (count > 0) {
      addedList.push(localization.t('notification ' + docsName, { smart_count: count }));
    }
  });

  entries.notifContent = addedList.join(', ');
  next();
}