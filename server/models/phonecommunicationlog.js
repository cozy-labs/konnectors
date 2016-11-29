'use strict';

const cozydb = require('cozydb');

module.exports = cozydb.getModel('PhoneCommunicationLog', {
  docType: String,
  docTypeVersion: String,
  timestamp: String,
  msisdn: String,
  partner: String,
  length: Number,
  chipType: String,
  type: String,
  latitude: Number,
  longitude: Number,
  networkType: String,
  description: String,
  endCause: String,
});
