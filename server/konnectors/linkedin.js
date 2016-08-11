'use strict';

const request = require('request');
const https = require('https');
const url = require('url');
const cheerio = require('cheerio');
const log = require('printit')({ prefix: 'Linkedin', date: true });

const localization = require('../lib/localization_manager');
const Contact = require('../models/contact');
const Tag = require('../models/tag');
const ContactHelper = require('../lib/contact_helper');
const CompareContacts = require('../lib/compare_contacts');
const linkedin = require('../lib/linkedin_helper');

const fetcher = require('../lib/fetcher');
const async = require('async');

const ACCOUNT_TYPE = 'com.linkedin';


/**
* Load landing page to retrieve the csrf token needed in login request.
* More info on csrf -> https://en.wikipedia.org/wiki/Cross-site_request_forgery
*
* The html parsing is done with cheerio, a "jquery like" that can be run on
* the server side.
*/
function retrieveTokens(requiredFields, entries, data, next) {
  const opts = {
    url: 'https://linkedin.com',
    jar: true,
  };

  log.info('Retrieving CSRF Token...');

  request.get(opts, (err, res, body) => {
    if (err) {
      return next(err);
    }

    if (body.status && body.status === 'error') {
      return next(body.status_details);
    }

    const $ = cheerio.load(body);

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
  const opts = {
    url: 'https://www.linkedin.com/uas/login-submit',
    jar: true,
    form: {
      session_key: requiredFields.login,
      session_password: requiredFields.password,
      loginCsrfParam: entries.csrfToken,
      submit: 'Sign+in',
    },
  };

  log.info('Signing in...');
  request.post(opts, (err, res, body) => {
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
  let contactsUrl = 'https://www.linkedin.com/contacts/api/contacts/';
  contactsUrl += '?start=0&count=10000&fields=id';

  const opts = {
    url: contactsUrl,
    jar: true,
    json: true,
  };

  log.info('Retrieving contact list...');

  request.get(opts, (err, res, body) => {
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

  Contact.all((err, contacts) => {
    if (err) {
      return next(err);
    }

    entries.cozyContactsByFn = {};
    entries.cozyContactsByAccountIds = {};

    contacts.forEach((contact) => {
      entries.cozyContactsByFn[contact.fn] = contact;
      const account = contact.getAccount(ACCOUNT_TYPE, entries.accountName);

      if (account) {
        entries.cozyContactsByAccountIds[account.id] = contact;
      }
    });

    // Initialise the counters
    entries.contactStats = {
      created: 0,
      updated: 0,
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
  Tag.getOrCreate({ name: 'linkedin', color: '#1B86BC' }, (err, tag) => {
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
    const opts = url.parse(imageUrl);

    https.get(opts, (stream) => {
      stream.on('error', (err) => {
        log.error(err);
      });

      fromCozy.attachFile(stream, { name: 'picture' }, (err) => {
        if (err) {
          return next(err);
        }
        log.info(`Picture successfully saved for ${fromCozy.fn}.`);
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

  let newRev = ContactHelper.intrinsicRev(fromCozy);

  log.debug('after-:\n', newRev);
  fromCozy.save((err, saved) => {
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
  const linkAccount = ContactHelper.getAccount(
    contact, ACCOUNT_TYPE, entries.accountName
  );
  const imageUrl = contact.imageUrl;

  delete contact.imageUrl;

  // Case where the contact already exists and where it was imported from
  // Linkedin.
  if (entries.cozyContactsByAccountIds[linkAccount.id]) {
    const cozyContact = entries.cozyContactsByAccountIds[linkAccount.id];
    const newRev = ContactHelper.intrinsicRev(contact);
    const previousRev = ContactHelper.intrinsicRev(cozyContact);

    // Already up to date, nothing to do.
    if (newRev === previousRev) {
      log.info(`LinkedIn contact ${cozyContact.fn} is up to date.`);
      next();
    } else {
      log.info(`Update ${cozyContact.fn} with LinkedIn data.`);

      updateContact(cozyContact, contact, imageUrl, entries.contactStats, next);
    }
  } else if (entries.cozyContactsByFn[contact.fn]) {
    // Case where the contact already exists but was not imported from Linkedin.
    const cozyContact = entries.cozyContactsByFn[contact.fn];

    log.info(`Link ${cozyContact.fn} to linkedin account and update data.`);

    updateContact(cozyContact, contact, imageUrl, entries.contactStats, next);
  } else {
    // Case where the contact is not listed in the database.
    log.info(`Create new contact for ${contact.fn}.`);
    Contact.create(contact, (err, createdContact) => {
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
  const retrieveContactData = (contact, next) => {
    const contactUrl = 'https://www.linkedin.com/contacts/api/contacts/' +
      `${contact.id}/?fields=name,first_name,last_name,` +
      'emails_extended,phone_numbers,sites,addresses,' +
      'company,title,geo_location,profiles,twitter,tag,' +
      ' secure_profile_image_url';

    const opts = {
      url: contactUrl,
      jar: true,
      json: true,
    };

    request.get(opts, (err, res, body) => {
      if (err) {
        return next(err);
      }

      if (body.status && body.status === 'error') {
        return next(body.status_details);
      }


      let datapoints = [];

      // Fill datapoints
      const bodyData = body.contact_data;

      datapoints = datapoints.concat(linkedin.getPhoneNumber(bodyData));
      datapoints = datapoints.concat(linkedin.getEmails(bodyData));
      datapoints = datapoints.concat(linkedin.getUrls(bodyData));
      datapoints = datapoints.concat(linkedin.getAddresses(bodyData));

      // Contact data composition
      const newFormatedContact = new Contact({
        n: `${bodyData.last_name};${bodyData.first_name}`,
        fn: bodyData.name,
        org: bodyData.company ? bodyData.company.name : null,
        title: bodyData.title,
        tags: ['linkedin'],
        datapoints,
      });

      newFormatedContact.imageUrl = bodyData.secure_profile_image_url;


      // Set information source for the given contact. It adds a flag
      // to say that the contact comes from Linkedin.
      ContactHelper.setAccount(newFormatedContact, {
        type: ACCOUNT_TYPE,
        name: entries.accountName,
        id: bodyData.id,
      });

      return saveContacts(newFormatedContact, entries, next);
    });
  };


  const contacts = entries.listContacts;

  async.eachSeries(contacts, retrieveContactData, (err) => {
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
  let localizationkey;
  let options;
  const stats = entries.contactStats;

  // create the notification
  log.info(`import finished :
    ${stats.created} contacts created
  ${stats.updated} contacts updated`);

  if (stats.created > 0) {
    localizationkey = 'notification contacts created';
    options = {
      smart_count: stats.created,
    };
    entries.notifContent = localization.t(localizationkey, options);
  }

  if (stats.updated > 0) {
    localizationkey = 'notification contacts updated';
    options = {
      smart_count: stats.updated,
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

  fields: {
    login: 'text',
    password: 'password',
  },

  models: {
    contact: Contact,
  },

  fetch: (requiredFields, callback) => {
    log.info('Import started');
    fetcher.new()
    .use(retrieveTokens)
    .use(logIn)
    .use(retrieveContactList)
    .use(prepareCozyContacts)
    .use(getOrCreateTag)
    .use(retrieveAndSaveContacts)
    .use(createNotificationContent)
    .args(requiredFields, {}, {})
    .fetch((err, fields, entries) => {
      if (err) {
        callback(err);
      } else {
        callback(null, entries.notifContent);
      }
    });
  },
};
