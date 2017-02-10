'use strict';

var async = require('async');
var request = require('request');
var cozydb = require('cozydb');
var ical = require('cozy-ical');

var baseKonnector = require('../lib/base_konnector');
var localization = require('../lib/localization_manager');

var Event = require('../models/event');

/*
 * The goal of this connector is to fetch ICS file from an URL, parse it and
 * and store events in the Cozy
 */
var connector = module.exports = baseKonnector.createNew({
  name: 'Ical Feed',

  category: 'social',
  color: {
    hex: '#A75BCB',
    css: '#A75BCB'
  },

  fields: {
    url: {
      type: 'text'
    },
    calendar: {
      type: 'text',
      advanced: true
    }
  },

  dataType: ['calendar'],

  models: [Event],

  fetchOperations: [downloadFile, parseFile, extractEvents, saveEvents, buildNotifContent]

});

function downloadFile(requiredFields, entries, data, next) {
  connector.logger.info('Downloading ICS file...');
  request.get(requiredFields.url, function (err, res, body) {
    if (err) {
      connector.logger.error('Download failed.');
      return next('request error');
    }

    connector.logger.info('Download succeeded.');
    data.ical = body;
    return next();
  });
}

/* Parse file, based on timezone set at user level. */
function parseFile(requiredFields, entries, data, next) {
  connector.logger.info('Parsing ICS file...');
  cozydb.api.getCozyUser(function (err, user) {
    if (err || user === null) {
      connector.logger.error('Cannot retrieve Cozy user timezone.');
      connector.logger.error('Parsing cannot be performed.');
      if (err === null) {
        connector.logger.error('Cannot retrieve Cozy user timezone.');
      }

      return next('parsing error');
    }

    var parser = new ical.ICalParser();
    var options = { defaultTimezone: user.timezone };
    parser.parseString(data.ical, options, function (err, result) {
      if (err) {
        connector.logger.error('Parsing failed.');
        connector.logger.error(err);
        return next('parsing error');
      }

      data.result = result;
      return next();
    });
  });
}

function extractEvents(requiredFields, entries, data, next) {
  entries.events = Event.extractEvents(data.result, requiredFields.calendar);
  return next();
}

function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving Events...');
  entries.nbCreations = 0;
  entries.nbUpdates = 0;
  async.eachSeries(entries.events, function (icalEvent, done) {
    icalEvent.tags = [requiredFields.calendar];
    if (icalEvent.start.indexOf('T00:00:00+00:00') > 0 && icalEvent.end.indexOf('T00:00:00+00:00') > 0) {
      icalEvent.start = icalEvent.start.substring(0, 10);
      icalEvent.end = icalEvent.end.substring(0, 10);
    }
    Event.createOrUpdate(icalEvent, function (err, cozyEvent, changes) {
      if (err) {
        connector.logger.error(err);
        connector.logger.error('Event cannot be saved.');
      } else {
        if (changes.creation) entries.nbCreations++;
        if (changes.update) entries.nbUpdates++;
        return done();
      }
    });
  }, function (err) {
    if (err) {
      connector.logger.info(err);
      return next('error occurred during import.');
    }
    connector.logger.info('Events are saved.');
    return next();
  });
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    var localizationKey = 'notification events created';
    var options = {
      smart_count: entries.nbCreations
    };
    entries.notifContent = localization.t(localizationKey, options);
  }
  if (entries.nbUpdates > 0) {
    var _localizationKey = 'notification events updated';
    var _options = {
      smart_count: entries.nbUpdates
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(_localizationKey, _options);
    } else {
      entries.notifContent += ' ' + localization.t(_localizationKey, _options);
    }
  }
  return next();
}