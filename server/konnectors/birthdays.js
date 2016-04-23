'use strict';

const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const slugify = require('cozy-slug');

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

const Contact = require('../models/contact');
const Event = require('../models/event');


/*
 * The goal of this connector is to extract contact birthdays for contacts
 * whire are labelized with given tag. Then it creates a yearly recurrent event
 * for each birthday.
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Birthdays',

  fields: {
    tag: 'text',
    calendar: 'text',
  },

  models: [Event],

  fetchOperations: [
    getContacts,
    extractBirthdays,
    saveEvents,
    buildNotifContent,
  ],

});


function getContacts(requiredFields, entries, data, next) {
  connector.logger.info('Retrieving contacts from the Cozy');
  Contact.all((err, contacts) => {
    if (err) {
      connector.logger.error('Cannot retrieve contacts from database');
    } else {
      data.contacts = contacts.filter((contact) =>
        _.includes(contact.tags, requiredFields.tag)
      );
      connector.logger.info('Contacts retrieved.');
    }
    next(err);
  });
}


function extractBirthdays(requiredFields, entries, data, next) {
  entries.birthdays = [];
  data.contacts.forEach((contact) => {
    if (contact.bday !== undefined) {
      const date = moment(contact.bday, 'YYYY-MM-DD');
      const contactName = contact.getName();
      if (date.isValid()) {
        entries.birthdays.push({
          date,
          contactName,
        });
      }
    }
  });
  next();
}


function saveEvents(requiredFields, entries, data, next) {
  connector.logger.info('Saving birthdays...');
  entries.nbCreations = 0;

  async.eachSeries(entries.birthdays, (birthday, done) => {
    const localizationKey = 'konnector birthdays birthday';
    const birthdayLabel = localization.t(localizationKey);
    const data = {
      description: `${birthdayLabel} ${birthday.contactName}`,
      start: birthday.date.format('YYYY-MM-DD'),
      end: birthday.date.add(1, 'days').format('YYYY-MM-DD'),
      rrule: 'FREQ=YEARLY;INTERVAL=1',
      id: `${birthday.date.format('MM-DD')}-${slugify(birthday.contactName)}`,
      tags: [requiredFields.calendar],
    };

    Event.createOrUpdate(data, (err, cozyEvent, changes) => {
      if (err) {
        connector.logger.error(
          `Birthday for ${birthday.contactName} was not created`);
      }
      if (changes.creation) entries.nbCreations++;
      done();
    });
  }, (err) => {
    if (err) connector.logger.error(err);
    connector.logger.info(`${entries.nbCreations} birthdays were created.`);
    next();
  });
}


function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    const localizationKey = 'notification birthdays creation';
    const options = {
      smart_count: entries.nbCreations,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  next();
}
