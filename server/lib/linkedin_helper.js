
"use strict";

const ContactHelper = require('../lib/contact_helper');

class linkedin {
  // Extract phone numbers from given linkedin data structure.
  getPhoneNumber(data) {
    const listPhones = []

    if (data.phone_numbers) {
      data.phone_numbers.forEach((number) => {

        listPhones.push({
          name: 'tel',
          type: number.type.toLowerCase(),
          value: number.number.replace(/ /g, ''),
        });
      });
    }

    return listPhones;
  }


  // Extract emails from given linkedin data structure.
  getEmails(data) {
    const listEmails = [];

    if (data.emails_extended) {
      data.emails_extended.forEach((email) => {
        listEmails.push({
          name: 'email',
          value: email.email,
          type: 'internet',
          pref: email.primary || undefined,
        });
      });
    }

    return listEmails;
  }


  // Extract urls from given linkedin data structure.
  getUrls(data) {
    const listUrls = [];

    if (data.sites) {
      data.sites.forEach((site) => {
        listUrls.push({
          name: 'url',
          value: site.url,
          type: site.name,
        });
      });
    }

    if (data.profiles) {
      data.profiles.forEach((profile) => {
        listUrls.push({
          name: 'url',
          value: profile.url,
          type: 'linkedin',
        });
      });
    }

    if (data.twitter) {
      data.twitter.forEach((twitter) => {
        listUrls.push({
          name: 'url',
          value: twitter.url,
          type: 'twitter',
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
  getAddresses(data) {
    const listAddresses = [];

    if (data.location) {
      const segmentAddress = data.location.split(', ')
      .reverse();
      const country = segmentAddress[0] || '';
      //const region = segmentAddress[1] || '';
      //const locality = segmentAddress[2] || '';
    }

    if (data.addresses) {
      data.addresses.forEach((address) => {
        let addressArray = ContactHelper.adrStringToArray(address.raw);
        addressArray[6] = country

          listAddresses.push({
            name: 'adr',
            value: addressArray,
            type: 'main',
          });
      });
    }

    return listAddresses;
  }
}


module.exports = linkedin;
