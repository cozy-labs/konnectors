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
let connector = module.exports = baseKonnector.createNew({
  name: 'Birthdays',

  fields: {
    tag: 'text',
    calendar: 'text'
  },

  models: [Event],

  fetchOperations: [
    getContacts,
    extractBirthdays,
    saveEvents,
    buildNotifContent
  ]

});


function getContacts(requiredFields, entries, data, next) {
  connector.logger.info('Retrieving contacts from the Cozy');
  Contact.all((err, contacts) => {
    if (err) {
      connector.logger.error('Cannot retrieve contacts from database');
    } else {
      data.contacts = contacts.filter((contact) => {
        return _.includes(contact.tags, requiredFields.tag);
      });
      connector.logger.info('Contacts retrieved.');
    }
    next(err);
  });
}


function extractBirthdays(requiredFields, entries, data, next) {
  entries.birthdays = [];
  data.contacts.forEach((contact) => {
    if (contact.bday !== undefined) {
      let date = moment(contact.bday, 'YYYY-MM-DD');
      if (date.isValid()) {
        entries.birthdays.push({
          date: date,
          contactName: contact.getName()
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
    let localizationKey = 'konnector birthdays birthday';
    let birthdayLabel = localization.t(localizationKey);
    let data = {
      description: `${birthdayLabel} ${birthday.contactName}`,
      start: birthday.date.format('YYYY-MM-DD'),
      end: birthday.date.add(1, 'days').format('YYYY-MM-DD'),
      rrule: "FREQ=YEARLY;INTERVAL=1",
      id: `${birthday.date.format('MM-DD')}-${slugify(birthday.contactName)}`,
      tags: [requiredFields.calendar]
    };
    Event.createOrUpdate(data, (err, cozyEvent, changes) => {
      if (err) connector.logger.error(
          `Birthday for ${birthday.contactName} was not created`);
      if (changes.creation) entries.nbCreations++;
      done();
    });

  }, (err) => {
    connector.logger.info(`${entries.nbCreations} birthdays were created.`);
    next();
  });
}


function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.nbCreations > 0) {
    let localizationKey = 'notification birthdays creation';
    let options = {
      nbCreations: entries.nbCreations,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  next();
}

