'use strict';

var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');

var factory = require('../lib/base_konnector');

var filterExisting = require('../lib/filter_existing');
var saveDataAndFile = require('../lib/save_data_and_file');
var localization = require('../lib/localization_manager');
var linkBankOperation = require('../lib/link_bank_operation');

var Bill = require('../models/bill');

var connector = module.exports = factory.createNew({
  name: 'DirectEnergie',
  vendorLink: 'particuliers.direct-energie.com/mon-espace-client/',
  category: 'energy',
  color: {
    hex: '#FFDF00',
    css: 'linear-gradient(-180deg, #FFE600 0%, #FFDF00 51%, #FFD400 98%)'
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
  fetchOperations: [logIn, selectActiveAccount, parsePage, customFilterExisting, customSaveDataAndFile, customLinkBankOperation, buildNotifContent]
});

var log = connector.logger.info.bind(connector.logger);
var logErr = connector.logger.error.bind(connector.logger);

var ERROR_LOGIN = 'Les informations renseignées ne correspondent pas';

function logIn(requiredFields, bills, data, next) {
  log('Trying to log in...');

  var logInOptions = {
    method: 'POST',
    jar: true,
    url: 'https://particuliers.direct-energie.com/mon-espace-client/',
    form: {
      'tx_deauthentification[login]': requiredFields.login,
      'tx_deauthentification[password]': requiredFields.password,
      'tx_deauthentification[form_valid]': '1',
      'tx_deauthentification[redirect_url]': '',
      'tx_deauthentification[mdp_oublie]': 'Je+me+connecte'
    }
  };

  request(logInOptions, function (err, res, body) {
    if (err) {
      logErr('Error when logging in');
      next(err);
      return;
    }

    var $ = cheerio.load(body);
    var alerts = $('.alerte');
    if (alerts.length) {
      var alertText = alerts.find('.bodytext').text();
      if (alertText.indexOf(ERROR_LOGIN) !== -1) {
        next(new Error('bad credentials'));
        return;
      }
    }

    connector.logger.info('Logged in.');
    next();
  });
}

function selectActiveAccount(requiredFields, bills, data, next) {
  log('Going to active accounts pages.');

  var options = {
    method: 'GET',
    jar: true,
    url: 'https://clients.direct-energie.com/mon-compte/gerer-mes-comptes'
  };

  request(options, function (err, res, body) {
    if (err) {
      logErr('Unable to reach the active accounts pages.');
      next(err);
      return;
    }

    var $ = cheerio.load(body);

    var activeAccounts = $('.compte-actif');
    if (!activeAccounts.length) {
      next(new Error('No active accounts for this login.'));
      return;
    }

    var anchors = $(activeAccounts[0]).parent().find('a');

    var href = null;
    for (var i = 0; i < anchors.length; i++) {
      href = $(anchors[i]).attr('href');
      if (href !== '#') {
        break;
      }
    }

    if (href === null) {
      next(new Error("Couldn't find link to the active account."));
      return;
    }

    if (href[0] !== '/') {
      href = '/' + href;
    }

    log("Going to the active account's page.");

    options = {
      method: 'GET',
      jar: true,
      url: 'https://clients.direct-energie.com' + href
    };

    request(options, function (err) {
      if (err) {
        logErr("Unable to reach the account's page.");
        next(err);
        return;
      }

      log('Going to the bills page.');

      options = {
        method: 'GET',
        jar: true,
        url: 'https://clients.direct-energie.com/mes-factures/ma-facture-mon-echeancier/'
      };

      request(options, function (err, res, body) {
        if (err) {
          logErr('Unable to reach the bills page.');
          next(err);
          return;
        }

        log('Bills page reach, continuing.');

        data.body = body;
        next();
      });
    });
  });
}

function parsePage(requiredFields, bills, data, next) {
  log('Parsing page.');

  bills.fetched = [];

  var $ = cheerio.load(data.body);
  $('table.account-summary').each(function forEachTable() {
    var td = $(this);

    var title = td.find('td.status').text();
    var date = td.find('td.date').text();
    var amount = td.find('td.tarif').text();
    var paidDate = td.find('td.info').text();
    var downloadLink = td.find('td.download a').attr('href');

    // Sanitize.
    title = title.trim();

    date = moment(date, 'DD/MM/YYYY');

    paidDate = paidDate.replace('Payée le', '').replace('En cours', '').replace('Terminé', '').trim();
    paidDate = paidDate.length ? paidDate : date;
    paidDate = moment(paidDate, 'DD/MM/YYYY');

    amount = amount.replace(',', '.').replace('€', '').replace('par mois', '').replace('Montant en votre faveur :', '').trim();
    amount = parseFloat(amount);

    downloadLink = 'https://clients.direct-energie.com/' + downloadLink;

    var newBill = {
      date: date,
      paidDate: paidDate || date,
      amount: amount,
      vendor: 'DirectEnergie',
      type: 'energy',
      pdfurl: downloadLink,
      content: title
    };

    bills.fetched.push(newBill);
  });

  if (!bills.fetched.length) {
    log('No bills fetched');
    next(new Error('No bills fetched today.'));
    return;
  }

  log('Found ' + bills.fetched.length + ' bills.');
  next();
}

function customFilterExisting(requiredFields, bills, data, next) {
  filterExisting(connector.logger, Bill)(requiredFields, bills, data, next);
}

function customSaveDataAndFile(requiredFields, bills, data, next) {
  saveDataAndFile(connector.logger, Bill, {
    vendor: 'DirectEnergie',
    dateFormat: 'YYYYMMDD'
  }, ['bill'])(requiredFields, bills, data, next);
}

function customLinkBankOperation(requiredFields, bills, data, next) {
  linkBankOperation({
    log: connector.logger,
    model: Bill,
    identifier: 'DIRECT ENERGIE',
    dateDelta: 10,
    amountDelta: 0.1
  })(requiredFields, bills, data, next);
}

function buildNotifContent(requiredFields, bills, data, next) {
  if (bills.filtered.length > 0) {
    var localizationKey = 'notification bills';
    var options = {
      smart_count: bills.filtered.length
    };
    bills.notifContent = localization.t(localizationKey, options);
  }
  next();
}