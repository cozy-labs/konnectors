'use strict';

var request = require('request');
var https = require('https');
var url = require('url');
var cheerio = require('cheerio');
var log = require('printit')({ prefix: 'Linkedin', date: true });

var localization = require('../lib/localization_manager');
var Event = require('../models/event');
var Tag = require('../models/tag');
var ContactHelper = require('../lib/contact_helper');
var CompareContacts = require('../lib/compare_contacts');
var linkedin = require('../lib/linkedin_helper');

var fetcher = require('../lib/fetcher');
var async = require('async');

var ACCOUNT_TYPE = 'com.linkedin';

function downloadFile(requiredFields, entries, data, next) {
  console.log("download");
  next();
}

function downloadFile(requiredFields, entries, data, next) {
  console.log("download");
  next();
}

function extractEvents(requiredFields, entries, data, next) {
  console.log("display");
  next();
}

function saveEvents(requiredFields, entries, data, next) {
  console.log("display");
  next();
}

module.exports = {
  name: 'Ical Feed',
  slug: 'ics',
  description: 'konnector description ics',

  fields: {
    url: 'text'
  },

  models: {
    event: Event
  },

  fetch: function fetch(requiredFields, callback) {
    log.info('Import started');
    fetcher.new().use(downloadFile).use(displayFile).args(requiredFields, {}, {}).fetch(function (err, fields, entries) {
      if (err) {
        callback(err);
      } else {
        callback(null, entries.notifContent);
      }
    });
  }
};