'use strict';

const request = require('request');
const https = require('https');
const url = require('url');
const cheerio = require('cheerio');
const log = require('printit')({prefix: 'Linkedin', date: true});

const localization = require('../lib/localization_manager');
const Contact = require('../models/contact');
const Tag = require('../models/tag');
const ContactHelper = require('../lib/contact_helper');
const CompareContacts = require('../lib/compare_contacts');
const linkedin = require('../lib/linkedin_helper');

const ACCOUNT_TYPE = 'com.linkedin';


module.exports = {
  name: 'Linkedin',
  slug: 'linkedin',
  description: 'konnector description linkedin',

  fields: {
    login: 'text',
    password: 'password'
  },

  models: {
    contact: Contact
  },

  fetch: (requiredFields, callback) => {
    log.info('Import started');

    Promise.resolve(requiredFields)
    .then(retrieveTokens)
    .then(logIn)
    .then(retrieveContactList)
    .then(prepareCozyContacts)
    .then(getOrCreateTag)
    .then(retrieveAndSaveContacts)
    .then(createNotificationContent)
    .then((notifContent) => {
      callback(null, notifContent);
    }, (reason) => {
      callback(reason);
    });
  }
};


/**
* Load landing page to retrieve the csrf token needed in login request.
* More info on csrf -> https://en.wikipedia.org/wiki/Cross-site_request_forgery
*
* The html parsing is done with cheerio, a "jquery like" that can be run on
* the server side.
*/
function retrieveTokens(requiredFields) {
  return new Promise((resolve, reject) => {
    const data = {
      requiredFields,
      entries: {}
    };

    const opts = {
      url: 'https://linkedin.com',
      jar: true
    };

    log.info('Retrieving CSRF Token...');

    request.get(opts, (err, res, body) => {
      if (err) {
        reject(new Error(err));
      }

      if (body.status && body.status === 'error') {
        reject(new Error(body.status_details));
      }
      else {
        const $ = cheerio.load(body);

        data.entries.csrfToken = $('#loginCsrfParam-login').val();
        data.entries.accountName = data.requiredFields.login;

        log.info('CSRF Token retrieved successfully.');

        resolve(data);
      }
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}

/**
* Make the login request with the user inputs (login/password) and the CSRF
* token retrieved in the previous step.
*/
function logIn(data) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: 'https://www.linkedin.com/uas/login-submit',
      jar: true,
      form: {
        session_key: data.requiredFields.login,
        session_password: data.requiredFields.password,
        loginCsrfParam: data.entries.csrfToken,
        submit: 'Sign+in'
      }
    };

    log.info('Signing in...');
    request.post(opts, (err, res, body) => {
      if (err) {
        reject(new Error(err));
      }

      if (body === '') {
        log.info('Login succeeded!');
      }
      else {
        reject(new Error('Wrong login or password.'));
      }

      resolve(data);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
* Retrieve a list of all Linkedin ID contacts available. The linkedin ID will
* be used to retrieve additional data about the contact.
*/
function retrieveContactList(data) {
  return new Promise((resolve, reject) => {
    let contactsUrl = 'https://www.linkedin.com/contacts/api/contacts/';
    contactsUrl += '?start=0&count=10000&fields=id';

    const opts = {
      url: contactsUrl,
      jar: true,
      json: true
    };

    log.info('Retrieving contact list...');

    request.get(opts, (err, res, body) => {
      if (err) {
        reject(new Error(err));
      }

      if (body.status && body.status === 'error') {
        reject(new Error(body.status_details));
      }
      else {
        data.entries.listContacts = body.contacts;

        if (data.entries.listContacts) {
          log.info('Contact list retrieved.');
        }
        else {
          reject(new Error('Error retrieving contacts from request'));
        }
      }
      resolve(data);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
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
function prepareCozyContacts(data) {
  return new Promise((resolve, reject) => {
    log.info('Load Cozy contacts...');

    Contact.all((err, contacts) => {
      if (err) {
        reject(new Error(err));
      }

      data.entries.cozyContactsByFn = {};
      data.entries.cozyContactsByAccountIds = {};
      for (const contact of contacts) {
        data.entries.cozyContactsByFn[contact.fn] = contact;
        const account = contact.getAccount(ACCOUNT_TYPE, data.entries.accountName);
        if (account) {
          data.entries.cozyContactsByAccountIds[account.id] = contact;
        }
      }

      // Initialise the counters
      data.entries.contactStats = {
        created: 0,
        updated: 0
      };

      log.info('Cozy contacts loaded.');

      resolve(data);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
 * Try to get the matching Contact tag to the account. If it not exit, create it
 */
function getOrCreateTag(data) {
  return new Promise((resolve, reject) => {
    log.info('Get or create count tag');
    Tag.getOrCreate({name: 'linkedin', color: '#1B86BC'}, (err, tag) => {
      if (err) {
        reject(new Error(err));
      }

      data.entries.tag = tag;

      resolve(data);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
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
function retrieveAndSaveContacts(data) {
  log.info('Retrieve contacts data');

  // Launch add contacts retrieving
  return Promise.all(data.entries.listContacts.map((contact) => {
    const contactData = {
      entries: data.entries,
      contact
    };

    return retrieveContactData(contactData);
  }))
  // Process responses synchronously
  .then((contactsArray) => {
    return saveContacts(contactsArray, data);
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
 * Retrieve a contact with his id and process the data retrieved to create a
 * Contact model
 */
function retrieveContactData(data) {
  return new Promise((resolve, reject) => {

    const contactUrl = 'https://www.linkedin.com/contacts/api/contacts/' +
      `${data.contact.id}/?fields=name,first_name,last_name,` +
      'emails_extended,phone_numbers,sites,addresses,' +
      'company,title,geo_location,profiles,twitter,tag,' +
      ' secure_profile_image_url';

    const opts = {
      url: contactUrl,
      jar: true,
      json: true
    };

    request.get(opts, (err, res, body) => {
      if (err) {
        reject(new Error(err));
      }

      if (body.status && body.status === 'error') {
        reject(new Error(body.status_details));
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
        datapoints
      });

      // TODO ensure it could not be set via the constructor.
      newFormatedContact.imageUrl = bodyData.secure_profile_image_url;

      // Set information source for the given contact. It adds a flag
      // to say that the contact comes from Linkedin.
      ContactHelper.setAccount(newFormatedContact, {
        type: ACCOUNT_TYPE,
        name: data.entries.accountName,
        id: bodyData.id
      });

      resolve(newFormatedContact);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
* Take an array of contact and save theme in the Data System. If the contact
* doesn't already exist, it is created. If the contact exists, it's updated
* with the Linkedin data.
*/
function saveContacts(arrayContacts, data) {
  return new Promise((resolve, reject) => {
    arrayContacts.forEach((contact) => {
      const linkAccount = ContactHelper.getAccount(
        contact, ACCOUNT_TYPE, data.entries.accountName
      );
      const imageUrl = contact.imageUrl;

      delete contact.imageUrl;

      // Case where the contact already exists and where it was imported from
      // Linkedin.
      if (data.entries.cozyContactsByAccountIds[linkAccount.id]) {
        const cozyContact = data.entries.cozyContactsByAccountIds[linkAccount.id];
        const newRev = ContactHelper.intrinsicRev(contact);
        const previousRev = ContactHelper.intrinsicRev(cozyContact);

        // Already up to date, nothing to do.
        if (newRev === previousRev) {
          log.info(`LinkedIn contact ${cozyContact.fn} is up to date.`);
        }
        else {
          log.info(`Update ${cozyContact.fn} with LinkedIn data.`);

          updateContact({
            fromCozy: cozyContact,
            formLinkedin: contact,
            imageUrl
          });
        }
      }
      // Case where the contact already exists but was not imported from Linkedin.
      else if (data.entries.cozyContactsByFn[contact.fn]) {
        const cozyContact = data.entries.cozyContactsByFn[contact.fn];

        log.info(`Link ${cozyContact.fn} to linkedin account and update data.`);

        updateContact({
          fromCozy: cozyContact,
          formLinkedin: contact,
          imageUrl
        });
      }
      // Case where the contact is not listed in the database.
      else {
        log.info(`Create new contact for ${contact.fn}.`);
        Contact.create(contact, (err, createdContact) => {
          if (err) {
            reject(new Error(err));
          }

          data.entries.contactStats.created += 1;
          savePicture({
            fromCozy: createdContact,
            imageUrl,
            stats: data.entries.contactStats
          });
        });
      }
    });
    resolve(data.entries.contactStats);
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
* Update contact with information coming from Linkedin, picture included.
*/
function updateContact(data) {
  return new Promise((resolve, reject) => {
    CompareContacts.mergeContacts(data.fromCozy, data.fromLinkedin);

    let newRev = ContactHelper.intrinsicRev(data.fromCozy);

    log.info('after-:\n', data.newRev);
    data.fromCozy.save((err, saved) => {
      if (err) {
        reject(err);
      }
      newRev = ContactHelper.intrinsicRev(saved);
      log.info('after-:\n', newRev);
      data.stats.updated += 1;
      savePicture(data);
    });
  })
  .catch((error) => {
    return Promise.reject(error);
  });
}


/**
* Change contact picture with the one coming from Linkedin.
*/
function savePicture(data) {
  return new Promise((resolve, reject) => {
    if (data.imageUrl) {
      const opts = url.parse(data.imageUrl);

      https.get(opts, (stream) => {
        stream.on('error', (err) => {
          log.error(err);
        });

        data.fromCozy.attachFile(stream, {name: 'picture'}, (err) => {
          if (err) {
            reject(err);
          }
          log.info(`Picture successfully saved for ${data.fromCozy.fn}.`);
          resolve();
        });
      });
    } else {
      resolve();
    }
  });
}


/**
 * Create the notification content bases on a given set of statistics
 */
function createNotificationContent(stats) {
  let localizationkey;
  let options;
  let notifContent;

  // create the notification
  log.info(`import finished :
    ${stats.created} contacts created
  ${stats.updated} contacts updated`);

  if (stats.created > 0) {
    localizationkey = 'notification linkedin created';
    options = {
      smart_count: stats.created
    };
    notifContent = localization.t(localizationkey, options);
  }

  if (stats.updated > 0) {
    localizationkey = 'notification linkedin updated';
    options = {
      smart_count: stats.updated
    };
    if (notifContent) {
      notifContent += '\n';
      notifContent += localization.t(localizationkey, options);
    }
    else {
      notifContent = localization.t(localizationkey, options);
    }
  }
  return notifContent;
}
