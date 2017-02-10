'use strict';

var async = require('async');
var request = require('request');
var cozydb = require('cozydb');
var ical = require('cozy-ical');
var cheerio = require('cheerio');
var baseKonnector = require('../lib/base_konnector');
var localization = require('../lib/localization_manager');

var Event = require('../models/event');

/* The goal of this connector is to fecth doctor appointment events from the
service doctolib.fr */

var connector = module.exports = baseKonnector.createNew({
  name: 'Doctolib',
  vendorLink: 'www.doctolib.fr/',
  category: 'health',
  color: {
    hex: '#0596DE',
    css: '#0596DE'
  },
  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    calendar: {
      type: 'text',
      advanced: true
    }
  },

  dataType: ['appointment'],

  models: [Event],

  fetchOperations: [getTimeZone, login, parseEventFiles, saveEvents, buildNotifContent]

});

var baseUrl = 'https://www.doctolib.fr/';

function login(requiredFields, entries, data, next) {
  var loginUrl = baseUrl + 'login';
  var eventsPageUrl = baseUrl + 'account/appointments';
  connector.logger.info('Logging in to doctolib');
  var options = {
    method: 'GET',
    jar: true,
    url: baseUrl
  };
  request(options, function (err, res, body) {
    if (err) {
      connector.logger.error('Coud not connect to the service');
      next(err);
    } else {
      var $ = cheerio.load(body);
      var form = {
        kind: $('input[name=kind]').val(),
        utf8: $('input[name=utf8]').val(),
        authenticity_token: $('input[name=authenticity_token]').val(),
        commit: $('input[name=commit]').val(),
        username: requiredFields.login,
        password: requiredFields.password
      };
      options.method = 'POST';
      options.url = loginUrl;
      options.form = form;
      request(options, function (err, res) {
        if (err) {
          next(err);
        } else if (res.statusCode === 302 && res.headers.location === baseUrl + 'sessions/new') {
          next('bad credentials');
        } else {
          options.url = eventsPageUrl;
          options.method = 'GET';
          request(options, function (err, res, body) {
            if (err) {
              next(err);
            } else {
              data.html = body;
              next();
            }
          });
        }
      });
    }
  });
}

function parseEventFiles(requiredFields, entries, data, next) {
  var $ = cheerio.load(data.html);
  var eventPathList = [];
  $('.appointment-booking').each(function (i, elem) {
    $($(elem).find('a').data('tooltip-html-unsafe'), 'a').each(function (j, link) {
      var href = $(link).attr('href');
      if (href.indexOf('/') === 0) {
        eventPathList.push(href);
        return false;
      }
      return true;
    });
  });
  var options = {
    jar: true,
    method: 'GET'
  };
  var parser = new ical.ICalParser();
  var parserOptions = { defaultTimezone: data.timezone };
  var events = [];
  async.eachSeries(eventPathList, function (path, callback) {
    options.url = '' + baseUrl + path;
    request(options, function (err, res, body) {
      if (err) {
        callback(err);
      } else {
        parser.parseString(body, parserOptions, function (err, result) {
          if (err) {
            connector.logger.error('Parsing failed.');
            callback(err);
          } else {
            var newEvents = Event.extractEvents(result, requiredFields.calendar);
            Array.prototype.push.apply(events, newEvents);
            callback();
          }
        });
      }
    });
  }, function (err) {
    if (err) {
      return next(err);
    }
    entries.events = events;
    return next();
  });
}

function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving Events...');
  entries.nbCreations = 0;
  entries.nbUpdates = 0;
  async.eachSeries(entries.events, function (icalEvent, callback) {
    icalEvent.caldavuri = icalEvent.id;
    icalEvent.docType = 'Event';
    delete icalEvent._id;
    delete icalEvent._attachments;
    delete icalEvent._rev;
    delete icalEvent.binaries;
    delete icalEvent.id;
    icalEvent.tags = [requiredFields.calendar];
    if (icalEvent.start.indexOf('T00:00:00+00:00') > 0 && icalEvent.end.indexOf('T00:00:00+00:00') > 0) {
      icalEvent.start = icalEvent.start.substring(0, 10);
      icalEvent.end = icalEvent.end.substring(0, 10);
    }
    /*
    It is not possible to use the generic Event.createOrUpdate
    because the uuid is not stable from a request to another.
    */
    var requestOptions = {
      key: {
        start: icalEvent.start,
        end: icalEvent.end,
        tags: icalEvent.tags,
        description: icalEvent.description
      }
    };
    Event.request('allLike', requestOptions, function (err, founds) {
      if (err) {
        callback(err);
      } else if (founds && founds.length > 0) {
        var found = founds[0];
        if (found.place !== icalEvent.place || found.details !== icalEvent.details) {
          connector.logger.info('Updating event');
          found.updateAttributes({
            place: icalEvent.place,
            details: icalEvent.details,
            rrule: icalEvent.rrule
          }, function (err) {
            if (err) {
              callback(err);
            } else {
              entries.nbUpdates++;
              callback();
            }
          });
        } else {
          callback();
        }
      } else {
        // Create the event.
        connector.logger.info('Creating event');
        Event.create(icalEvent, function (err) {
          if (err) {
            callback(err);
          } else {
            entries.nbCreations++;
            callback();
          }
        });
      }
    });
  }, function (err) {
    connector.logger.info('Events are saved.');
    next(err);
  });
}

function getTimeZone(requiredFields, entries, data, next) {
  cozydb.api.getCozyUser(function (err, user) {
    if (err || user === null) {
      connector.logger.error('Cannot retrieve Cozy user timezone.');
      connector.logger.error('Parsing cannot be performed.');
      if (err === null) {
        err = new Error('Cannot retrieve Cozy user timezone.');
      }
      return next(err);
    }
    data.timezone = user.timezone;
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
    if (!entries.notifContent) {
      entries.notifContent = localization.t(_localizationKey, _options);
    } else {
      entries.notifContent += ' ' + localization.t(_localizationKey, _options);
    }
  }
  return next();
}