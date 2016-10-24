const request = require('request').defaults({ jar: true });
const cheerio = require('cheerio');
const ical = require('./ical_feed');
const Event = require('../models/event');

const logger = require('printit')({
  prefix: 'Meetup',
  date: true,
});

const REQUEST_ERROR_KEY = 'request error';
const baseKonnector = require('../lib/base_konnector');

/**
 * The goal of this konnector is to fetch the iCal of the user with his Meetup events
 */
module.exports = baseKonnector.createNew({
  name: 'Meetup',
  vendorLink: 'http://www.meetup.com',

  fields: {
    login: 'text',
    password: 'password',
    calendar: 'text'
  },

  models: [Event],
  fetchOperations: [
    login
  ]
});

function login(requiredFields, billInfos, data, next) {
  request('https://secure.meetup.com/login/', (err, res, body) => {
    if (err) {
      logger.error(err);
      return next(REQUEST_ERROR_KEY);
    }

    const token = cheerio.load(body)('input[name=token]').val();
    const opts = {
      method: 'POST',
      url: 'https://secure.meetup.com/fr-FR/login/',
      headers: {
        Host: 'secure.meetup.com',
        'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:49.0) Gecko/20100101 Firefox/49.0'
      },
      form: {
        email: requiredFields.login,
        password: requiredFields.password,
        token,
        submitButton: 'Connexion',
        returnUri: 'http://www.meetup.com/',
        op: 'login',
        apiAppName: ''
      }
    };
    request(opts, (err, res, body) => {
      if (err) {
        logger.error(err);
        return next(REQUEST_ERROR_KEY);
      } else if (res.statusCode === 200) {
        // 200 if credentials are incorrect
        return next('bad credentials');
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        // Didn't redirect till the end
        request(res.headers.location, (err, res, body) => {
          sendToICalKonnector(body, requiredFields.calendar, next);
        });
      } else {
        // Already connected
        sendToICalKonnector(body, requiredFields.calendar, next);
      }
    });
  });
}


function sendToICalKonnector(body, calendar, next) {
  const icalUrl = cheerio.load(body)('li.ical-supported > a.export-feed-option').attr('href');
  ical.fetch({ url: icalUrl, calendar }, next);
}
