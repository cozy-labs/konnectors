'use strict';

const async = require('async');
const request = require('request');
const cozydb = require('cozydb');
const ical = require('cozy-ical');
const cheerio = require('cheerio');
const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const Event = require('../models/event');

/* The goal of this connector is to fecth doctor appointment events from the
service doctolib.fr */

const connector = module.exports = baseKonnector.createNew({
  name: 'Doctolib',

  fields: {
    login: 'text',
    password: 'password',
    calendar: 'text',
  },

  models: [Event],

  fetchOperations: [
    getTimeZone,
    login,
    parseEventFiles,
    saveEvents,
    buildNotifContent,
  ],

});

const baseUrl = 'https://www.doctolib.fr/';

function login(requiredFields, entries, data, next) {
  const loginUrl = `${baseUrl}login`;
  const eventsPageUrl = `${baseUrl}mon-compte/rendez-vous`;
  connector.logger.info('Logging in to doctolib');
  const options = {
    method: 'GET',
    jar: true,
    url: baseUrl,
  };
  request(options, (err, res, body) => {
    if (err) {
      connector.logger.error('Coud not connect to the service');
      next(err);
    } else {
      const $ = cheerio.load(body);
      const form = {
        kind: $('input[name=kind]').val(),
        utf8: $('input[name=utf8]').val(),
        authenticity_token: $('input[name=authenticity_token]').val(),
        commit: $('input[name=commit]').val(),
        username: requiredFields.login,
        password: requiredFields.password,
      };
      options.method = 'POST';
      options.url = loginUrl;
      options.form = form;
      request(options, (err, res) => {
        if (err) {
          next(err);
        }
        if (res.statusCode === 302 &&
          res.headers.location === `${baseUrl}sessions/nouveau`) {
          next('bad credentials');
        }
        options.url = eventsPageUrl;
        options.method = 'GET';
        request(options, (err, res, body) => {
          if (err) {
            next(err);
          }
          data.html = body;
          next();
        });
      });
    }
  });
}

function parseEventFiles(requiredFields, entries, data, next) {
  const $ = cheerio.load(data.html);
  const eventPathList = [];
  $('.appointment-booking').each((i, elem) => {
    $($(elem).find('a').data('tooltip-html-unsafe'), 'a').each((j, link) => {
      const href = $(link).attr('href');
      if (href.indexOf('/') === 0) {
        eventPathList.push(href);
        return false;
      }
      return true;
    });
  });
  const options = {
    jar: true,
    method: 'GET',
  };
  const parser = new ical.ICalParser();
  const parserOptions = { defaultTimezone: data.timezone };
  const events = [];
  async.eachSeries(eventPathList, (path, callback) => {
    options.url = `${baseUrl}${path}`;
    request(options, (err, res, body) => {
      if (err) {
        next(err);
      }
      parser.parseString(body, parserOptions, (err, result) => {
        if (err) {
          connector.logger.error('Parsing failed.');
          next(err);
        } else {
          const newEvents = Event.extractEvents(result,
            requiredFields.calendar);
          Array.prototype.push.apply(events, newEvents);
          callback();
        }
      });
    });
  }, (err) => {
    if (err) {
      next(err);
    }
    entries.events = events;
    next();
  });
}

function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving Events...');
  entries.nbCreations = 0;
  entries.nbUpdates = 0;
  async.eachSeries(entries.events, icalEvent => {
    icalEvent.caldavuri = icalEvent.id;
    icalEvent.docType = 'Event';
    delete icalEvent._id;
    delete icalEvent._attachments;
    delete icalEvent._rev;
    delete icalEvent.binaries;
    delete icalEvent.id;
    icalEvent.tags = [requiredFields.calendar];
    if (icalEvent.start.indexOf('T00:00:00+00:00') > 0 &&
      icalEvent.end.indexOf('T00:00:00+00:00') > 0) {
      icalEvent.start = icalEvent.start.substring(0, 10);
      icalEvent.end = icalEvent.end.substring(0, 10);
    }
    /*
    It is not possible to use the generic Event.createOrUpdate
    because the uuid is not stable from a request to another.
    */
    const requestOptions = {
      key: {
        start: icalEvent.start,
        end: icalEvent.end,
        tags: icalEvent.tags,
        description: icalEvent.description,
      },
    };
    Event.request('allLike', requestOptions, (err, founds) => {
      if (err) {
        next(err);
      }
      if (founds && founds.length > 0) {
        const found = founds[0];
        if (found.place !== icalEvent.place ||
            found.details !== icalEvent.details) {
          connector.logger.info('Updating event');
          event.updateAttributes({
            place: icalEvent.place,
            details: icalEvent.details,
            rrule: icalEvent.rrule,
          }, (err) => {
            if (err) {
              next(err);
            }
            entries.nbUpdates++;
            next();
          });
        } else {
          next();
        }
      } else {
        // Create the event.
        connector.logger.info('Creating event');
        Event.create(icalEvent, (err) => {
          if (err) {
            next(err);
          }
          entries.nbCreations++;
          next();
        });
      }
    });
  });
}

function getTimeZone(requiredFields, entries, data, next) {
  cozydb.api.getCozyUser((err, user) => {
    if (err || user === null) {
      connector.logger.error('Cannot retrieve Cozy user timezone.');
      connector.logger.error('Parsing cannot be performed.');
      if (err === null) {
        err = new Error('Cannot retrieve Cozy user timezone.');
      }
      next(err);
    } else {
      data.timezone = user.timezone;
      next();
    }
  });
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    const localizationKey = 'notification doctolib creation';
    const options = {
      smart_count: entries.nbCreations,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }
  if (entries.nbUpdates > 0) {
    const localizationKey = 'notification doctolib update';
    const options = {
      smart_count: entries.nbUpdates,
    };
    if (!entries.notifContent) {
      entries.notifContent = localization.t(localizationKey, options);
    } else {
      entries.notifContent += ` ${localization.t(localizationKey, options)}`;
    }
  }
  next();
}
