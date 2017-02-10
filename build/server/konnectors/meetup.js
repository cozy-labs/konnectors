'use strict';

var request = require('request').defaults({ jar: true });
var cheerio = require('cheerio');
var ical = require('./ical_feed');
var Event = require('../models/event');

var logger = require('printit')({
  prefix: 'Meetup',
  date: true
});

var REQUEST_ERROR_KEY = 'request error';
var baseKonnector = require('../lib/base_konnector');

/**
 * The goal of this konnector is to fetch the iCal of the user with his Meetup events
 */
module.exports = baseKonnector.createNew({
  name: 'Meetup',
  vendorLink: 'http://www.meetup.com',

  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    calendar: {
      type: 'text'
    }
  },
  dataType: ['event'],
  models: [Event],
  fetchOperations: [login, logout]
});

function login(requiredFields, billInfos, data, next) {
  request('https://secure.meetup.com/login/', function (err, res, body) {
    if (err) {
      logger.error(err);
      return next(REQUEST_ERROR_KEY);
    }

    var token = cheerio.load(body)('input[name=token]').val();
    var opts = {
      method: 'POST',
      url: 'https://secure.meetup.com/fr-FR/login/',
      headers: {
        Host: 'secure.meetup.com',
        'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0'
      },
      form: {
        email: requiredFields.login,
        password: requiredFields.password,
        token: token,
        submitButton: 'Connexion',
        returnUri: 'http://www.meetup.com/',
        op: 'login',
        apiAppName: ''
      }
    };
    request(opts, function (err, res) {
      if (err) {
        logger.error(err);
        return next(REQUEST_ERROR_KEY);
      } else if (res.statusCode === 200) {
        // 200 if credentials are incorrect
        return next('bad credentials');
      } else if (res.statusCode === 302 && res.headers.location) {
        logger.info('Connected');
        request(res.headers.location, function (err, res, body) {
          if (err) {
            return next(err);
          }
          sendToICalKonnector(body, requiredFields.calendar, next);
        });
      }
    });
  });
}

function sendToICalKonnector(body, calendar, next) {
  var $ = cheerio.load(body);
  var icalUrls = $('ul[data-filter="going"] > li > a.export-feed-option').map(function (i, elem) {
    return $(elem).attr('href');
  }).get().filter(function (url) {
    var matches = true;
    // We do not want to get the rss feed
    if (url.match(/rss/)) {
      matches = false;
    }
    // We do not want to get the google feed
    if (url.match(/google/)) {
      matches = false;
    }
    // We do not want to get the webcal feed
    if (url.match(/webcal/)) {
      matches = false;
    }
    return matches;
  });
  if (typeof icalUrls !== 'undefined' && icalUrls.length > 0) {
    ical.fetch({ url: icalUrls[0], calendar: calendar }, next);
  } else {
    logger.info('No feed found');
    next('no feed');
  }
}

function logout(requiredFields, billInfos, data, next) {
  request('https://www.meetup.com/fr-FR/logout/', function (err, res) {
    if (err) {
      return next(err);
    }
    if (res.statusCode === 302) {
      logger.info('Disconnected');
    }
    return next();
  });
}