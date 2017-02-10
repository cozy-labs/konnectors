'use strict';

var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');

var filterExisting = require('../lib/filter_existing');
var saveDataAndFile = require('../lib/save_data_and_file');
var localization = require('../lib/localization_manager');
var linkBankOperation = require('../lib/link_bank_operation');
var factory = require('../lib/base_konnector');

var Bill = require('../models/bill');

var logger = require('printit')({
  prefix: 'Numericable',
  date: true
});

var fileOptions = {
  vendor: 'Numéricable',
  dateFormat: 'YYYYMMDD'
};

function login(requiredFields, entries, data, next) {
  var accountUrl = 'https://moncompte.numericable.fr';
  var connectionUrl = 'https://connexion.numericable.fr';
  var appKeyOptions = {
    method: 'GET',
    jar: true,
    url: accountUrl + '/pages/connection/Login.aspx'
  };

  var logInOptions = {
    method: 'POST',
    jar: true,
    url: connectionUrl + '/Oauth/Oauth.php',
    form: {
      action: 'connect',
      linkSSO: connectionUrl + '/pages/connection/Login.aspx?link=HOME',
      appkey: '',
      isMobile: ''
    }
  };

  var redirectOptions = {
    method: 'POST',
    jar: true,
    url: connectionUrl
  };

  var signInOptions = {
    method: 'POST',
    jar: true,
    url: connectionUrl + '/Oauth/login/',
    form: {
      login: requiredFields.login,
      pwd: requiredFields.password
    }
  };

  var tokenAuthOptions = {
    method: 'POST',
    jar: true,
    url: accountUrl + '/pages/connection/Login.aspx?link=HOME',
    qs: {
      accessToken: ''
    }
  };

  var billOptions = {
    method: 'GET',
    jar: true,
    uri: accountUrl + '/pages/billing/Invoice.aspx'
  };

  logger.info('Getting appkey');
  request(appKeyOptions, function (err, res, body) {
    var appKey = '';
    var $ = void 0;

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
    request(logInOptions, function (err) {
      if (err) {
        logger.error('Login failed');
        return next('error occurred during import.');
      }

      logger.info('Signing in');
      request(signInOptions, function (err, res) {
        var redirectUrl = '';
        if (res && res.headers) {
          redirectUrl = res.headers.location;
          // Numéricable returns a 302 even in case of errors
          if (!redirectUrl || redirectUrl === '/Oauth/connect/') {
            err = true;
          }
        }

        if (err) {
          logger.error('Signin failed');
          return next('bad credentials');
        }

        redirectOptions.url += redirectUrl;

        logger.info('Fetching access token');
        request(redirectOptions, function (err, res, body) {
          var accessToken = '';

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
          request(tokenAuthOptions, function (err) {
            if (err) {
              logger.error('Authentication by token failed');
              return next('error occurred during import.');
            }

            logger.info('Fetching bills page');
            request(billOptions, function (err, res, body) {
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
  var $ = cheerio.load(data.html);
  var baseURL = 'https://moncompte.numericable.fr';

  // Analyze bill listing table.
  logger.info('Parsing bill page');

  // First bill
  var firstBill = $('#firstFact');
  var billDate = firstBill.find('h2 span');
  var billTotal = firstBill.find('p.right');
  var billLink = firstBill.find('a.linkBtn');

  var bill = {
    date: moment(billDate.html(), 'DD/MM/YYYY'),
    amount: parseFloat(billTotal.html().replace(' €', '').replace(',', '.')),
    pdfurl: baseURL + billLink.attr('href')
  };

  if (bill.date && bill.amount && bill.pdfurl) {
    bills.fetched.push(bill);
  }

  // Other bills
  $('#facture > div[id!="firstFact"]').each(function (index, element) {
    billDate = $(element).find('h3').html().substr(3);
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

  logger.info(bills.fetched.length + ' bill(s) retrieved');

  if (!bills.fetched.length) {
    return next('no bills retrieved');
  }

  next();
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(requiredFields, entries, data, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.filtered && entries.filtered.length > 0) {
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

  category: 'isp',
  color: {
    hex: '#53BB0F',
    css: '#53BB0F'
  },

  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    folderPath: {
      type: 'folder',
      advanced: true
    }
  },

  dataType: ['bill'],

  models: [Bill],

  fetchOperations: [login, parsePage, customFilterExisting, customSaveDataAndFile, linkBankOperation({
    log: logger,
    minDateDelta: 1,
    maxDateDelta: 1,
    model: Bill,
    amountDelta: 0.1,
    identifier: ['numericable']
  }), buildNotifContent]
});