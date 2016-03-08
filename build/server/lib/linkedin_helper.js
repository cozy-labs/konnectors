
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ContactHelper = require('../lib/contact_helper');

var linkedin = function () {
  function linkedin() {
    _classCallCheck(this, linkedin);
  }

  _createClass(linkedin, [{
    key: 'getPhoneNumber',

    // Extract phone numbers from given linkedin data structure.
    value: function getPhoneNumber(data) {
      var listPhones = [];

      if (data.phone_numbers) {
        data.phone_numbers.forEach(function (number) {

          listPhones.push({
            name: 'tel',
            type: number.type.toLowerCase(),
            value: number.number.replace(/ /g, '')
          });
        });
      }

      return listPhones;
    }

    // Extract emails from given linkedin data structure.

  }, {
    key: 'getEmails',
    value: function getEmails(data) {
      var listEmails = [];

      if (data.emails_extended) {
        data.emails_extended.forEach(function (email) {
          listEmails.push({
            name: 'email',
            value: email.email,
            type: 'internet',
            pref: email.primary || undefined
          });
        });
      }

      return listEmails;
    }

    // Extract urls from given linkedin data structure.

  }, {
    key: 'getUrls',
    value: function getUrls(data) {
      var listUrls = [];

      if (data.sites) {
        data.sites.forEach(function (site) {
          listUrls.push({
            name: 'url',
            value: site.url,
            type: site.name
          });
        });
      }

      if (data.profiles) {
        data.profiles.forEach(function (profile) {
          listUrls.push({
            name: 'url',
            value: profile.url,
            type: 'linkedin'
          });
        });
      }

      if (data.twitter) {
        data.twitter.forEach(function (twitter) {
          listUrls.push({
            name: 'url',
            value: twitter.url,
            type: 'twitter'
          });
        });
      }

      return listUrls;
    }

    /**
    * Currently there isn't a good address parser. So all the addresses are set
    * in the locality fields. The Linkedin API defines some fields
    * precisely but we can only handle properly the country. That's why this
    * function keeps only the country.
    * When we'll have a correct address parser we'll be able to include
    * region and locality.
    */

  }, {
    key: 'getAddresses',
    value: function getAddresses(data) {
      var listAddresses = [];

      if (data.location) {
        var segmentAddress = data.location.split(', ').reverse();
        var _country = segmentAddress[0] || '';
        //const region = segmentAddress[1] || '';
        //const locality = segmentAddress[2] || '';
      }

      if (data.addresses) {
        data.addresses.forEach(function (address) {
          var addressArray = ContactHelper.adrStringToArray(address.raw);
          addressArray[6] = country;

          listAddresses.push({
            name: 'adr',
            value: addressArray,
            type: 'main'
          });
        });
      }

      return listAddresses;
    }
  }]);

  return linkedin;
}();

module.exports = linkedin;