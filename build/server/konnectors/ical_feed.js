'use strict';

const async = require('async');
const request = require('request');
const cozydb = require('cozydb');
const ical = require('cozy-ical');

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const Event = require('../models/event');

/*
 * The goal of this connector is to fetch ICS file from an URL, parse it and
 * and store events in the Cozy
 */
let connector = module.exports = baseKonnector.createNew({
  name: 'Ical Feed',

  fields: {
    url: 'text',
    calendar: 'text'
  },

  models: [Event],

  fetchOperations: [downloadFile, parseFile, extractEvents, saveEvents, buildNotifContent]

});

function downloadFile(requiredFields, entries, data, next) {
  connector.logger.info("Downloading ICS file...");
  request.get(requiredFields.url, (err, res, body) => {
    if (err) {
      connector.logger.error("Download failed.");
    } else {
      connector.logger.info("Download succeeded.");
      data.ical = body;
    }
    next(err);
  });
}

/* Parse file, based on timezone set at user level. */
function parseFile(requiredFields, entries, data, next) {
  connector.logger.info("Parsing ICS file...");
  cozydb.api.getCozyUser((err, user) => {

    if (err || user == null) {
      connector.logger.error("Cannot retrieve Cozy user timezone.");
      connector.logger.error("Parsing cannot be performed.");
      if (err === null) err = new Error('Cannot retrieve Cozy user timezone.');
      next(err);
    } else {
      let parser = new ical.ICalParser();
      let options = { defaultTimezone: user.timezone };
      parser.parseString(data.ical, options, (err, result) => {

        if (err) {
          connector.logger.error("Parsing failed.");
        } else {
          data.result = result;
        }

        next(err);
      });
    }
  });
}

function extractEvents(requiredFields, entries, data, next) {
  entries.events = Event.extractEvents(data.result, requiredFields.calendar);
  next();
}

function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info("Saving Events...");
  entries.nbCreations = 0;
  entries.nbUpdates = 0;

  async.eachSeries(entries.events, (icalEvent, done) => {
    icalEvent.tags = [requiredFields.calendar];
    Event.createOrUpdate(icalEvent, (err, cozyEvent, changes) => {
      if (err) {
        connector.logger.error(err);
        connector.logger.error("Event cannot be saved.");
      } else {
        if (changes.creation) entries.nbCreations++;
        if (changes.update) entries.nbUpdates++;
        done();
      }
    });
  }, function (err) {
    connector.logger.info("Events are saved.");
    next(err);
  });
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    let localizationKey = 'notification ical_feed creation';
    let options = {
      nbCreations: entries.nbCreations
    };
    entries.notifContent = localization.t(localizationKey, options);
  }
  if (entries.nbUpdates > 0) {
    let localizationKey = 'notification ical_feed update';
    let options = {
      nbUpdates: entries.nbUpdates
    };
    if (entries.notifContent === undefined) entries.notifContent = localization.t(localizationKey, options);else entries.notifContent += ' ' + localization.t(localizationKey, options);
  }
  next();
};