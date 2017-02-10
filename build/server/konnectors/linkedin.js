'use strict';

var request = require('request');
var https = require('https');
var url = require('url');
var cheerio = require('cheerio');
var log = require('printit')({ prefix: 'Linkedin', date: true });

var localization = require('../lib/localization_manager');
var Contact = require('../models/contact');
var Tag = require('../models/tag');
var ContactHelper = require('../lib/contact_helper');
var CompareContacts = require('../lib/compare_contacts');
var linkedin = require('../lib/linkedin_helper');

var fetcher = require('../lib/fetcher');
var async = require('async');

var ACCOUNT_TYPE = 'com.linkedin';

/**
* Load landing page to retrieve the csrf token needed in login request.
* More info on csrf -> https://en.wikipedia.org/wiki/Cross-site_request_forgery
*
* The html parsing is done with cheerio, a "jquery like" that can be run on
* the server side.
*/
function retrieveTokens(requiredFields, entries, data, next) {
  var opts = {
    url: 'https://linkedin.com',
    jar: true
  };

  log.info('Retrieving CSRF Token...');

  request.get(opts, function (err, res, body) {
    if (err) {
      return next(err);
    }

    if (body.status && body.status === 'error') {
      return next(body.status_details);
    }

    var $ = cheerio.load(body);

    entries.csrfToken = $('#loginCsrfParam-login').val();
    entries.accountName = requiredFields.login;

    log.info('CSRF Token retrieved successfully.');

    return next();
  });
}

/**
* Make the login request with the user inputs (login/password) and the CSRF
* token retrieved in the previous step.
*/
function logIn(requiredFields, entries, data, next) {
  var opts = {
    url: 'https://www.linkedin.com/uas/login-submit',
    jar: true,
    form: {
      session_key: requiredFields.login,
      session_password: requiredFields.password,
      loginCsrfParam: entries.csrfToken,
      submit: 'Sign+in'
    }
  };

  log.info('Signing in...');
  request.post(opts, function (err, res, body) {
    if (err) {
      return next(err);
    }

    if (body === '') {
      log.info('Login succeeded!');
    } else {
      return next(new Error('Wrong login or password.'));
    }

    return next();
  });
}

/**
* Retrieve a list of all Linkedin ID contacts available. The linkedin ID will
* be used to retrieve additional data about the contact.
*/
function retrieveContactList(requiredFields, entries, data, next) {
  var contactsUrl = 'https://www.linkedin.com/contacts/api/contacts/';
  contactsUrl += '?start=0&count=10000&fields=id';

  var opts = {
    url: contactsUrl,
    jar: true,
    json: true
  };

  log.info('Retrieving contact list...');

  request.get(opts, function (err, res, body) {
    if (err) {
      return next(err);
    }

    if (body.status && body.status === 'error') {
      return next(new Error(body.status_details));
    }

    entries.listContacts = body.contacts;

    if (entries.listContacts) {
      log.info('Contact list retrieved.');
    } else {
      return next(new Error('Error retrieving contacts from request'));
    }
    return next();
  });
}

/**
* Load all Cozy contacts, then perform several operations:
*
* * Keep only contacts linked to the current LinkedinAccount
* * Order them in a map where the LinkedIn account ID is the key
* * Order them in a map where the contact full name is the key.
*
* That way we will be able to check if the contact should be updated (because
* it already exists) or if it should be created.
*/
function prepareCozyContacts(requiredFields, entries, data, next) {
  log.info('Load Cozy contacts...');

  Contact.all(function (err, contacts) {
    if (err) {
      return next(err);
    }

    entries.cozyContactsByFn = {};
    entries.cozyContactsByAccountIds = {};

    contacts.forEach(function (contact) {
      entries.cozyContactsByFn[contact.fn] = contact;
      var account = contact.getAccount(ACCOUNT_TYPE, entries.accountName);

      if (account) {
        entries.cozyContactsByAccountIds[account.id] = contact;
      }
    });

    // Initialise the counters
    entries.contactStats = {
      created: 0,
      updated: 0
    };

    log.info('Cozy contacts loaded.');

    return next();
  });
}

/**
 * Try to get the matching Contact tag to the account. If it not exit, create it
 */
function getOrCreateTag(requiredFields, entries, data, next) {
  log.info('Get or create count tag');
  Tag.getOrCreate({ name: 'linkedin', color: '#1B86BC' }, function (err, tag) {
    if (err) {
      return next(err);
    }

    entries.tag = tag;

    return next();
  });
}

/**
* Change contact picture with the one coming from Linkedin.
*/
function savePicture(fromCozy, imageUrl, next) {
  if (imageUrl) {
    var opts = url.parse(imageUrl);

    https.get(opts, function (stream) {
      stream.on('error', function (err) {
        log.error(err);
      });

      fromCozy.attachFile(stream, { name: 'picture' }, function (err) {
        if (err) {
          return next(err);
        }
        log.info('Picture successfully saved for ' + fromCozy.fn + '.');
        return next();
      });
    });
  } else {
    next();
  }
}

/**
* Update contact with information coming from Linkedin, picture included.
*/
function updateContact(fromCozy, fromLinkedin, imageUrl, contactStats, next) {
  CompareContacts.mergeContacts(fromCozy, fromLinkedin);

  var newRev = ContactHelper.intrinsicRev(fromCozy);

  log.debug('after-:\n', newRev);
  fromCozy.save(function (err, saved) {
    if (err) {
      next(err);
    }
    newRev = ContactHelper.intrinsicRev(saved);
    log.debug('after-:\n', newRev);
    contactStats.updated += 1;
    savePicture(fromCozy, imageUrl, next);
  });
}

/**
* Take an array of contact and save theme in the Data System. If the contact
* doesn't already exist, it is created. If the contact exists, it's updated
* with the Linkedin data.
*/
function saveContacts(contact, entries, next) {
  var linkAccount = ContactHelper.getAccount(contact, ACCOUNT_TYPE, entries.accountName);
  var imageUrl = contact.imageUrl;

  delete contact.imageUrl;

  // Case where the contact already exists and where it was imported from
  // Linkedin.
  if (entries.cozyContactsByAccountIds[linkAccount.id]) {
    var cozyContact = entries.cozyContactsByAccountIds[linkAccount.id];
    var newRev = ContactHelper.intrinsicRev(contact);
    var previousRev = ContactHelper.intrinsicRev(cozyContact);

    // Already up to date, nothing to do.
    if (newRev === previousRev) {
      log.info('LinkedIn contact ' + cozyContact.fn + ' is up to date.');
      next();
    } else {
      log.info('Update ' + cozyContact.fn + ' with LinkedIn data.');

      updateContact(cozyContact, contact, imageUrl, entries.contactStats, next);
    }
  } else if (entries.cozyContactsByFn[contact.fn]) {
    // Case where the contact already exists but was not imported from Linkedin.
    var _cozyContact = entries.cozyContactsByFn[contact.fn];

    log.info('Link ' + _cozyContact.fn + ' to linkedin account and update data.');

    updateContact(_cozyContact, contact, imageUrl, entries.contactStats, next);
  } else {
    // Case where the contact is not listed in the database.
    log.info('Create new contact for ' + contact.fn + '.');
    Contact.create(contact, function (err, createdContact) {
      if (err) {
        return next(err);
      }

      entries.contactStats.created += 1;
      return savePicture(createdContact, imageUrl, next);
    });
  }
}

/**
 * Manage synchronisation between two actions:
 * - Launch the data retrieving for each contact asynchronously and process them
 *   to create Contact model
 * - When the last step is finish, lauch the saving process
 *
 * The saving process could also be asynchronous but it seem more easy to debug
 * with a step by step structur.
 */
function retrieveAndSaveContacts(requiredFields, entries, data, done) {
  log.info('Retrieve contacts data');

  /**
  * Retrieve a contact with his id and process the data retrieved to create a
  * Contact model
  */
  var retrieveContactData = function retrieveContactData(contact, next) {
    var contactUrl = 'https://www.linkedin.com/contacts/api/contacts/' + (contact.id + '/?fields=name,first_name,last_name,') + 'emails_extended,phone_numbers,sites,addresses,' + 'company,title,geo_location,profiles,twitter,tag,' + ' secure_profile_image_url';

    var opts = {
      url: contactUrl,
      jar: true,
      json: true
    };

    request.get(opts, function (err, res, body) {
      if (err) {
        return next(err);
      }

      if (body.status && body.status === 'error') {
        return next(body.status_details);
      }

      var datapoints = [];

      // Fill datapoints
      var bodyData = body.contact_data;

      datapoints = datapoints.concat(linkedin.getPhoneNumber(bodyData));
      datapoints = datapoints.concat(linkedin.getEmails(bodyData));
      datapoints = datapoints.concat(linkedin.getUrls(bodyData));
      datapoints = datapoints.concat(linkedin.getAddresses(bodyData));

      // Contact data composition
      var newFormatedContact = new Contact({
        n: bodyData.last_name + ';' + bodyData.first_name,
        fn: bodyData.name,
        org: bodyData.company ? bodyData.company.name : null,
        title: bodyData.title,
        tags: ['linkedin'],
        datapoints: datapoints
      });

      newFormatedContact.imageUrl = bodyData.secure_profile_image_url;

      // Set information source for the given contact. It adds a flag
      // to say that the contact comes from Linkedin.
      ContactHelper.setAccount(newFormatedContact, {
        type: ACCOUNT_TYPE,
        name: entries.accountName,
        id: bodyData.id
      });

      return saveContacts(newFormatedContact, entries, next);
    });
  };

  var contacts = entries.listContacts;

  async.eachSeries(contacts, retrieveContactData, function (err) {
    if (err) {
      log.error(err);
    } else {
      log.info('All linkedin contacts have been processed');
    }

    done();
  });
}

/**
 * Create the notification content bases on a given set of statistics
 */
function createNotificationContent(requiredFields, entries, data, next) {
  var localizationkey = void 0;
  var options = void 0;
  var stats = entries.contactStats;

  // create the notification
  log.info('import finished :\n    ' + stats.created + ' contacts created\n  ' + stats.updated + ' contacts updated');

  if (stats.created > 0) {
    localizationkey = 'notification contacts created';
    options = {
      smart_count: stats.created
    };
    entries.notifContent = localization.t(localizationkey, options);
  }

  if (stats.updated > 0) {
    localizationkey = 'notification contacts updated';
    options = {
      smart_count: stats.updated
    };
    if (entries.notifContent) {
      entries.notifContent += '\n';
      entries.notifContent += localization.t(localizationkey, options);
    } else {
      entries.notifContent = localization.t(localizationkey, options);
    }
  }
  next();
}

module.exports = {
  name: 'Linkedin',
  slug: 'linkedin',
  description: 'konnector description linkedin',
  vendorLink: 'www.linkedin.com',

  category: 'social',
  color: {
    hex: '#0077B5',
    css: '#0077B5'
  },

  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    }
  },

  dataType: ['contact'],

  models: {
    contact: Contact
  },

  fetch: function fetch(requiredFields, callback) {
    log.info('Import started');
    fetcher.new().use(retrieveTokens).use(logIn).use(retrieveContactList).use(prepareCozyContacts).use(getOrCreateTag).use(retrieveAndSaveContacts).use(createNotificationContent).args(requiredFields, {}, {}).fetch(function (err, fields, entries) {
      if (err) {
        callback(err);
      } else {
        callback(null, entries.notifContent);
      }
    });
  }
};