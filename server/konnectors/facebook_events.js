'use strict';

const async = require('async');
const request = require('request');
const cozydb = require('cozydb');
const moment = require('moment');

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const Event = require('../models/event');

const API_ROOT = 'https://graph.facebook.com/v2.5/';

const appId = '181683981887939' ;
const appSecret = 'eb1a6431ec6f4adc5ac9ec4dc98d3962';

const scope = 'user_events' ;


/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Facebook Events',
  slug: 'facebook_events',
  customView: '<p>To konnect your Facebook account, click here:</p>' +
    '<a href=' + getOAuthProxyUrl() + ' target="_blank" >Facebook Login</a>',

  fields: {
    accessToken: 'text',
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
  var baseUri = 'https://jacquarg.github.io/proxy_redirect/facebook_events/';
  var params = 'appId=' + appId + '&scope=' + scope;
  params += '&redirect=display'
  return  baseUri + '?' + params ;
}


function updateToken(requiredFields, entries, data, next) {
  connector.logger.info('Update facebook token');

  request.get(API_ROOT + 'oauth/access_token?' +
    'grant_type=fb_exchange_token&client_id=' + appId +
    '&client_secret=' + appSecret +
    '&fb_exchange_token=' + requiredFields.accessToken,
    (err, res, body) => {
      if (err) {
        connector.logger.error('Update token failed: ' + err.msg);
        // TODO : notification "reconnect"
      } else {
        data.accessToken = JSON.parse(body).access_token ;
      }
      next(err);
  });

}

// Save konnector's fieldValues during fetch process.
function saveTokenInKonnector(requiredFields, entries, data, callback) {
  connector.logger.info('Save refreshed token.');

  var Konnector = require('../models/konnector');
    // TODO: should work:
    // Konnector.get(connector.slug, function(err, konnector) {
  Konnector.all((err, konnectors) => {
    if (err) {
      connector.logger.error("Can't fetch konnector instances", + err.msg);
      return callback(err);
    }

    try {
      var konnector = konnectors.filter(function(k) {
          return k.slug === connector.slug;
      })[0];

      // Find which account we are using now.
      var currentAccount = konnector.accounts.filter(function(account) {
        return account.accessToken === requiredFields.accessToken;
      })[0];

      currentAccount.accessToken = data.accessToken;

    } catch (e) {
      connector.logger.error("Can't fetch konnector instances");
      return callback(e);
    }

    konnector.updateAttributes({ accounts: konnector.accounts }, callback);
  });
}


function downloadData(requiredFields, entries, data, next) {
  connector.logger.info('Downloading events data from Facebook...');
  request.get(API_ROOT + 'me/events?access_token='+ requiredFields.accessToken,
    (err, res, body) => {

    if (err) {
      connector.logger.error('Download failed: ' + err.msg);
    } else {
      connector.logger.info('Download succeeded.');
      // We don't handle pagination here, thinking that, with polling, usefull // events will fit in the first page.
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


/* Parse file, based on timezone set at user level. */
function parseData(requiredFields, entries, data, next) {
  connector.logger.info('Parsing raw Events Data...');

  var list = data.raw.map((fbEvent) => {
    try {
      if (fbEvent.rsvp_status !== "attending") {
        return null;
      }

      var date = new Date(fbEvent.start_time);

      var locationStr = '';
      if (fbEvent.place) {
          locationStr = fbEvent.place.name;
          if (fbEvent.place.location) {
            locationStr += ', ' + fbEvent.place.location.street + ', ';
            locationStr += fbEvent.place.location.city;
            locationStr += ' ' + fbEvent.place.location.zip;
            locationStr += ' (' + fbEvent.place.location.latitude;
            locationStr += ', ' + fbEvent.place.location.longitude + ')';
          }
      }

      return {
        start: date.toISOString(),
        end: moment(date).add(2, 'hours').toISOString(), // TODO create an end time !
        place: locationStr,
        details: fbEvent.description,
        description: fbEvent.name,
        tags: ['Facebook Events'],
        // attendees: []
        // created:
        id: "" + fbEvent.id,
        // caldavuri: "" + fbEvent.id, // actualy used elsewhere as external id.
        // uuid
        lastModification: new Date().toISOString(),

        accounts: {
          "type": "com.facebook",
          "name": "me",
          "id": "" + fbEvent.id,
          "lastUpdate": new Date().toISOString() }
      };

    } catch(e) {
      connector.logger.error('Skip an event while parsing it.', e);
      return null;
    }
  });

  entries.events = list.filter((ev) => { return ev !== null });

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
    next(err);
  });
}


function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    const localizationKey = 'notification facebook_events creation';
    const options = {
      smart_count: entries.nbCreations,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }
  if (entries.nbUpdates > 0) {
    const localizationKey = 'notification facebook_events update';
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
