'use strict';

var _ = require('lodash');
var async = require('async');
var moment = require('moment');
var slugify = require('cozy-slug');

var baseKonnector = require('../lib/base_konnector');
var localization = require('../lib/localization_manager');

var Contact = require('../models/contact');
var Event = require('../models/event');

/*
 * The goal of this connector is to extract contact birthdays for contacts
 * whire are labelized with given tag. Then it creates a yearly recurrent event
 * for each birthday.
 */
var connector = module.exports = baseKonnector.createNew({
  name: 'Birthdays',

  fields: {
    tag: 'text',
    calendar: 'text'
  },

  models: [Event],

  fetchOperations: [getContacts, extractBirthdays, saveEvents, buildNotifContent]

});

function getContacts(requiredFields, entries, data, next) {
  connector.logger.info('Retrieving contacts from the Cozy');
  Contact.all(function (err, contacts) {
    if (err) {
      connector.logger.error('Cannot retrieve contacts from database');
    } else {
      data.contacts = contacts.filter(function (contact) {
        return _.includes(contact.tags, requiredFields.tag);
      });
      connector.logger.info('Contacts retrieved.');
    }
    next(err);
  });
}

function extractBirthdays(requiredFields, entries, data, next) {
  entries.birthdays = [];
  data.contacts.forEach(function (contact) {
    if (contact.bday !== undefined) {
      var date = moment(contact.bday, 'YYYY-MM-DD');
      var contactName = contact.getName();
      if (date.isValid()) {
        entries.birthdays.push({
          date: date,
          contactName: contactName
        });
      }
    }
  });
  next();
}

function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving birthdays...');
  entries.nbCreations = 0;

  async.eachSeries(entries.birthdays, function (birthday, done) {
    var localizationKey = 'konnector birthdays birthday';
    var birthdayLabel = localization.t(localizationKey);
    var data = {
      description: birthdayLabel + ' ' + birthday.contactName,
      start: birthday.date.format('YYYY-MM-DD'),
      end: birthday.date.add(1, 'days').format('YYYY-MM-DD'),
      rrule: 'FREQ=YEARLY;INTERVAL=1',
      id: birthday.date.format('MM-DD') + '-' + slugify(birthday.contactName),
      tags: [requiredFields.calendar]
    };

    Event.createOrUpdate(data, function (err, cozyEvent, changes) {
      if (err) {
        connector.logger.error('Birthday for ' + birthday.contactName + ' was not created');
      }
      if (changes.creation) entries.nbCreations++;
      done();
    });
  }, function (err) {
    if (err) connector.logger.error(err);
    connector.logger.info(entries.nbCreations + ' birthdays were created.');
    next();
  });
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    var localizationKey = 'notification birthdays creation';
    var options = {
      smart_count: entries.nbCreations
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  next();
}