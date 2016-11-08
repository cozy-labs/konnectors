'use strict';

const async = require('async');
const request = require('request');
const moment = require('moment');
const toQueryString = require('querystring').stringify;

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const Event = require('../models/event');

const API_ROOT = 'https://graph.facebook.com/v2.6/';

const appId = '991700800927312';
const appSecret = 'a04e8cf918a382ea0b19cf1b6fbc2506';

const scope = 'user_events';


/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Facebook Events',
  slug: 'facebook_events',
  connectUrl: getOAuthProxyUrl(),

  fields: {
    accessToken: 'hidden',
    calendar: 'text',
  },

  models: [Event],

  fetchOperations: [
    updateToken,
    saveTokenInKonnector,
    downloadData,
    parseData,
    saveEvents,
    buildNotifContent,
  ],

});

function getOAuthProxyUrl() {
  const baseUri = 'https://jacquarg.github.io/proxy_redirect/facebook_events/';
  const params = {
    appId,
    scope,
    redirect: 'url',
  };

  return `${baseUri}?${toQueryString(params)}&redirect_url=`;
}


function updateToken(requiredFields, entries, data, next) {
  connector.logger.info('Update facebook token');

  const params = {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: requiredFields.accessToken,
  };

  request.get(`${API_ROOT}oauth/access_token?${toQueryString(params)}`,
    (err, res, body) => {
      if (err) {
        connector.logger.error(`Update token failed: ${err.msg}`);
        // TODO : notification token is broken, "reconnect"
      } else {
        data.accessToken = JSON.parse(body).access_token;
      }
      next(err);
    });
}

// Save konnector's fieldValues during fetch process.
function saveTokenInKonnector(requiredFields, entries, data, callback) {
  connector.logger.info('Save refreshed token.');
  // The linter is desactivated because it is not possible to put the
  // require statement at the top of the file.
  /* eslint-disable global-require */
  const Konnector = require('../models/konnector');
  /* eslint-enable global-require */
  // TODO: should work:
  // Konnector.get(connector.slug, function(err, konnector) {
  Konnector.all((err, konnectors) => {
    if (err) {
      connector.logger.error(`Can't fetch konnector instances: ${err.msg}`);
      return callback(err);
    }
    let konnector = null;
    try {
      konnector = konnectors.filter(k => k.slug === connector.slug)[0];

      // Find which account we are using now.
      const currentAccount = konnector.accounts.filter(account =>
        account.accessToken === requiredFields.accessToken)[0];

      currentAccount.accessToken = data.accessToken;
    } catch (e) {
      connector.logger.error("Can't fetch konnector instances");
      return callback(e);
    }

    return konnector.updateAttributes({ accounts: konnector.accounts },
      callback);
  });
}


function downloadData(requiredFields, entries, data, next) {
  connector.logger.info('Downloading events data from Facebook...');
  request.get(`${API_ROOT}me/events?access_token=${requiredFields.accessToken}`,
    (err, res, body) => {
      if (err) {
        connector.logger.error(`Download failed: ${err.msg}`);
      } else {
        connector.logger.info('Download succeeded.');
        // We don't handle pagination here, thinking that,
        // with polling, usefull // events will fit in the first page.
        try {
          data.raw = JSON.parse(body).data;
        } catch (e) {
          connector.logger.error("Can't parse fetched data.");
          err = e;
        }
      }
      next(err);
    });
}


function parseData(requiredFields, entries, data, next) {
  connector.logger.info('Parsing raw Events Data...');

  const list = data.raw.map((fbEvent) => {
    try {
      if (fbEvent.rsvp_status !== 'attending') {
        return null;
      }

      const date = new Date(fbEvent.start_time);

      let locationStr = '';
      if (fbEvent.place) {
        locationStr = fbEvent.place.name;
        if (fbEvent.place.location) {
          if (fbEvent.place.location.street) {
            locationStr += `, ${fbEvent.place.location.street}, `;
          }
          if (fbEvent.place.location.city) {
            locationStr += fbEvent.place.location.city;
          }
          if (fbEvent.place.location.zip) {
            locationStr += ' ';
            locationStr += fbEvent.place.location.zip;
          }
          if (fbEvent.place.location.latitude &&
              fbEvent.place.location.longitude) {
            locationStr += ' (';
            locationStr += fbEvent.place.location.latitude;
            locationStr += ', ';
            locationStr += fbEvent.place.location.longitude;
            locationStr += ')';
          }
        }
      }

      return {
        start: date.toISOString(),
        end: moment(date).add(2, 'hours').toISOString(),
        place: locationStr,
        details: fbEvent.description,
        description: fbEvent.name,
        tags: [requiredFields.calendar],
        // attendees: []
        // created:

        // Event.createOrUpdate moves it id to caldavuri field.
        id: String(fbEvent.id),
        lastModification: new Date().toISOString(),

        accounts: {
          type: 'com.facebook',
          name: 'me',
          id: String(fbEvent.id),
          lastUpdate: new Date().toISOString(),
        },
      };
    } catch (e) {
      connector.logger.error('Skip an event while parsing it.', e);
      return null;
    }
  });

  entries.events = list.filter(ev => ev !== null);

  next();
}


function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving Events...');
  entries.nbCreations = 0;
  entries.nbUpdates = 0;
  async.eachSeries(entries.events, (fbEvent, done) => {
    Event.createOrUpdate(fbEvent, (err, cozyEvent, changes) => {
      if (err) {
        connector.logger.error(err);
        connector.logger.error('Event cannot be saved.');
      } else {
        if (changes.creation) entries.nbCreations++;
        if (changes.update) entries.nbUpdates++;
        done();
      }
    });
  }, (err) => {
    connector.logger.info('Events are saved.');
    return next(err);
  });
}


function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    const localizationKey = 'notification events created';
    const options = {
      smart_count: entries.nbCreations,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }
  if (entries.nbUpdates > 0) {
    const localizationKey = 'notification events updated';
    const options = {
      smart_count: entries.nbUpdates,
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(localizationKey, options);
    } else {
      entries.notifContent += ` ${localization.t(localizationKey, options)}`;
    }
  }
  next();
}
