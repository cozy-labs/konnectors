'use strict';

const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');

const filterExisting = require('../lib/filter_existing');
const saveDataAndFile = require('../lib/save_data_and_file');
const localization = require('../lib/localization_manager');
const linkBankOperation = require('../lib/link_bank_operation');
const factory = require('../lib/base_konnector');

const Bill = require('../models/bill');

const logger = require('printit')({
  prefix: 'Numericable',
  date: true
});

const fileOptions = {
  vendor: 'Numéricable',
  dateFormat: 'YYYYMMDD',
};

function login(requiredFields, entries, data, next) {
  const accountUrl = 'https://moncompte.numericable.fr';
  const connectionUrl = 'https://connexion.numericable.fr';
  const appKeyOptions = {
    method: 'GET',
    jar: true,
    url: `${accountUrl}/pages/connection/Login.aspx`
  };

  const logInOptions = {
    method: 'POST',
    jar: true,
    url: `${connectionUrl}/Oauth/Oauth.php`,
    form: {
      action: 'connect',
      linkSSO: `${connectionUrl}/pages/connection/Login.aspx?link=HOME`,
      appkey: '',
      isMobile: ''
    }
  };

  const redirectOptions = {
    method: 'POST',
    jar: true,
    url: connectionUrl
  };

  const signInOptions = {
    method: 'POST',
    jar: true,
    url: `${connectionUrl}/Oauth/login/`,
    form: {
      login: requiredFields.login,
      pwd: requiredFields.password
    }
  };

  const tokenAuthOptions = {
    method: 'POST',
    jar: true,
    url: `${accountUrl}/pages/connection/Login.aspx?link=HOME`,
    qs: {
      accessToken: ''
    }
  };

  const billOptions = {
    method: 'GET',
    jar: true,
    uri: `${accountUrl}/pages/billing/Invoice.aspx`
  };

  logger.info('Getting appkey');
  request(appKeyOptions, (err, res, body) => {
    let appKey = '';
    let $;

    if (!err) {
      $ = cheerio.load(body);
      appKey = $('#PostForm input[name="appkey"]').attr('value');
    }

    if (!appKey) {
      logger.info('Numericable: could not retrieve app key');
      return next('key not found');
    }

    logInOptions.form.appkey = appKey;

    logger.info('Logging in');
    request(logInOptions, (err) => {
      if (err) {
        logger.error('Login failed');
        return next('error occurred during import.');
      }

      logger.info('Signing in');
      request(signInOptions, (err, res) => {
        let redirectUrl = '';
        if (res && res.headers) {
          redirectUrl = res.headers.location;
          // Numéricable returns a 302 even in case of errors
          if (!redirectUrl || (redirectUrl === '/Oauth/connect/')) {
            err = true;
          }
        }

        if (err) {
          logger.error('Signin failed');
          return next('bad credentials');
        }

        redirectOptions.url += redirectUrl;

        logger.info('Fetching access token');
        request(redirectOptions, (err, res, body) => {
          let accessToken = '';

          if (!err) {
            $ = cheerio.load(body);
            accessToken = $('#accessToken').attr('value');
          }

          if (!accessToken) {
            logger.error('Token fetching failed');
            return next('error occurred during import.');
          }

          tokenAuthOptions.qs.accessToken = accessToken;

          logger.info('Authenticating by token');
          request(tokenAuthOptions, (err) => {
            if (err) {
              logger.error('Authentication by token failed');
              return next('error occurred during import.');
            }

            logger.info('Fetching bills page');
            request(billOptions, (err, res, body) => {
              if (err) {
                logger.error('An error occured while fetching bills page');
                return next('no bills retrieved');
              }

              data.html = body;
              return next();
            });
          });
        });
      });
    });
  });
}

// Layer to parse the fetched page to extract bill data.
function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];
  const $ = cheerio.load(data.html);
  const baseURL = 'https://moncompte.numericable.fr';

  // Analyze bill listing table.
  logger.info('Parsing bill page');

  // First bill
  const firstBill = $('#firstFact');
  let billDate = firstBill.find('h2 span');
  let billTotal = firstBill.find('p.right');
  let billLink = firstBill.find('a.linkBtn');

  let bill = {
    date: moment(billDate.html(), 'DD/MM/YYYY'),
    amount: parseFloat(billTotal.html().replace(' €', '').replace(',', '.')),
    pdfurl: baseURL + billLink.attr('href')
  };

  if (bill.date && bill.amount && bill.pdfurl) {
    bills.fetched.push(bill);
  }

  // Other bills
  $('#facture > div[id!="firstFact"]').each((index, element) => {
    billDate = $(element).find('h3')
              .html()
              .substr(3);
    billTotal = $(element).find('p.right');
    billLink = $(element).find('a.linkBtn');

    // Add a new bill information object.
    bill = {
      date: moment(billDate, 'DD/MM/YYYY'),
      amount: parseFloat(billTotal.html().replace(' €', '').replace(',', '.')),
      pdfurl: baseURL + billLink.attr('href')
    };

    if (bill.date && bill.amount && bill.pdfurl) {
      bills.fetched.push(bill);
    }
  });

  logger.info(`${bills.fetched.length} bill(s) retrieved`);

  if (!bills.fetched.length) {
    return next('no bills retrieved');
  }

  next();
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(
      requiredFields, entries, data, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.filtered && (entries.filtered.length > 0)) {
    entries.notifContent = localization.t('notification bills', {
      smart_count: entries.filtered.length
    });
  }

  next();
}

module.exports = factory.createNew({
  name: 'Numéricable',
  description: 'konnector description numericable',
  vendorLink: 'https://www.numericable.fr/',

  fields: {
    login: 'text',
    password: 'password',
    folderPath: 'folder'
  },

  models: [Bill],

  fetchOperations: [
    login,
    parsePage,
    customFilterExisting,
    customSaveDataAndFile,
    linkBankOperation({
      log: logger,
      minDateDelta: 1,
      maxDateDelta: 1,
      model: Bill,
      amountDelta: 0.1,
      identifier: ['numericable']
    }),
    buildNotifContent
  ]
});
