cozydb = require 'cozydb'

module.exports = cozydb.getModel 'GeoPoint',
  docTypeVersion: String
  msisdn: String
  timestamp: String
  latitude: Number
  longitude: Number
  radius: Number
