'use strict';

var request = require('request').defaults({
  jar: true
});
var moment = require('moment');
var cheerio = require('cheerio');
var baseKonnector = require('../lib/base_konnector');

var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');
var linkBankOperation = require('../lib/link_bank_operation');

var log = require('printit')({
  prefix: 'Sfr box',
  date: true
});

var fileOptions = {
  vendor: 'SFR',
  dateFormat: 'YYYYMMDD'
};

var Bill = require('../models/bill');

// Konnector
var connector = module.exports = baseKonnector.createNew({
  name: 'SFR Box',
  vendorLink: 'espace-client.sfr.fr/facture-fixe/consultation',
  category: 'isp',
  color: {
    hex: '#9E0017',
    css: 'linear-gradient(90deg, #EF0001 0%, #9E0017 100%)'
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
  fetchOperations: [getToken, logIn, fetchBillingInfo, parsePage, customFilterExisting, customSaveDataAndFile, linkBankOperation({
    log: log,
    model: Bill,
    identifier: ['SFR FIXE', 'SFR ADSL'],
    minDateDelta: 4,
    maxDateDelta: 20,
    amountDelta: 0.1
  }), buildNotifContent]
});

// Procedure to get the login token
function getToken(requiredFields, bills, data, next) {
  var url = 'https://www.sfr.fr/bounce?target=//www.sfr.fr/sfr-et-moi/bounce.html&casforcetheme=mire-sfr-et-moi&mire_layer';
  var options = {
    url: url,
    method: 'GET'
  };

  connector.logger.info('Getting the token on Sfr Website...');

  request(options, function (err, res, body) {
    if (err) {
      connector.logger.info(err);
      return next('token not found');
    }

    var $ = cheerio.load(body);
    data.token = $('input[name=lt]').val();

    connector.logger.info('Token retrieved');
    return next();
  });
}

// Procedure to login to Sfr website.
function logIn(requiredFields, bills, data, next) {
  var options = {
    method: 'POST',
    url: 'https://www.sfr.fr/cas/login?domain=mire-sfr-et-moi&service=https://www.sfr.fr/accueil/j_spring_cas_security_check#sfrclicid=EC_mire_Me-Connecter',
    form: {
      lt: data.token,
      execution: 'e1s1',
      _eventId: 'submit',
      username: requiredFields.login,
      password: requiredFields.password,
      identifier: ''
    }
  };

  connector.logger.info('Logging in on Sfr website...');

  request(options, function (err) {
    if (err) {
      connector.logger.info(err);
      return next('bad credentials');
    }

    connector.logger.info('Successfully logged in.');
    return next();
  });
}

function fetchBillingInfo(requiredFields, bills, data, next) {
  var url = 'https://espace-client.sfr.fr/facture-fixe/consultation';

  connector.logger.info('Fetch bill info');
  var options = {
    method: 'GET',
    url: url
  };
  request(options, function (err, res, body) {
    if (err) {
      log.error('An error occured while fetching bills');
      log.raw(err);
      return next(err);
    }
    connector.logger.info('Fetch bill info succeeded');

    data.html = body;
    return next();
  });
}

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];
  moment.locale('fr');
  var $ = cheerio.load(data.html);

  $('#tab tr').each(function each() {
    var date = $(this).find('.date').text();
    var prix = $(this).find('.prix').text().replace('€', '').replace(',', '.');
    var pdf = $(this).find('.liens a').attr('href');
    date = date.split(' ');
    date.pop();
    date = date.join(' ');
    date = moment(date, 'D MMM YYYY');
    prix = parseFloat(prix);
    pdf = 'https://espace-client.sfr.fr' + pdf;

    var bill = {
      date: date,
      type: 'Internet',
      amount: prix,
      pdfurl: pdf,
      vendor: 'Sfr'
    };
    bills.fetched.push(bill);
  });
  connector.logger.info('Successfully parsed the page');
  next();
}

function customFilterExisting(requiredFields, bills, data, next) {
  filterExisting(log, Bill)(requiredFields, bills, data, next);
}

function customSaveDataAndFile(requiredFields, bills, data, next) {
  var fnsave = saveDataAndFile(log, Bill, fileOptions, ['bill']);
  fnsave(requiredFields, bills, data, next);
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