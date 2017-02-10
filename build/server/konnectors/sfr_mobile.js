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
  prefix: 'Sfr mobile',
  date: true
});

var fileOptions = {
  vendor: 'SFR',
  dateFormat: 'YYYYMMDD'
};

var Bill = require('../models/bill');

// Konnector
var connector = module.exports = baseKonnector.createNew({
  name: 'SFR Mobile',
  vendorLink: 'espace-client.sfr.fr/facture-mobile/consultation',
  category: 'telecom',
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
    identifier: 'SFR MOBILE',
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
  var url = 'https://espace-client.sfr.fr/facture-mobile/consultation';

  connector.logger.info('Fetch bill info');
  var options = {
    method: 'GET',
    url: url
  };
  request(options, function (err, res, body) {
    if (err) {
      log.error('An error occured while fetching bills');
      log.raw(err);
      return next('request error');
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
  var baseURL = 'https://espace-client.sfr.fr';

  var firstBill = $('#facture');
  var firstBillUrl = $('#lien-telecharger-pdf').attr('href');

  if (firstBillUrl) {
    // The year is not provided, but we assume this is the current year or that
    // it will be provided if different from the current year
    var firstBillDate = firstBill.find('tr.header h3').text().substr(17);
    firstBillDate = moment(firstBillDate, 'D MMM YYYY');

    var price = firstBill.find('tr.total td.prix').text().replace('€', '').replace(',', '.');

    var bill = {
      date: firstBillDate,
      type: 'Mobile',
      amount: parseFloat(price),
      pdfurl: '' + baseURL + firstBillUrl,
      vendor: 'Sfr'
    };

    bills.fetched.push(bill);
  } else {
    connector.logger.info('wrong url for first PDF bill.');
  }

  $('#tab tr').each(function each() {
    var date = $(this).find('.date').text();
    var prix = $(this).find('.prix').text().replace('€', '').replace(',', '.');
    var pdf = $(this).find('.liens a').attr('href');

    if (pdf) {
      date = date.split(' ');
      date.pop();
      date = date.join(' ');
      date = moment(date, 'D MMM YYYY');
      prix = parseFloat(prix);
      pdf = '' + baseURL + pdf;

      var _bill = {
        date: date,
        type: 'Mobile',
        amount: prix,
        pdfurl: pdf,
        vendor: 'Sfr'
      };
      bills.fetched.push(_bill);
    } else {
      connector.logger.info('wrong url for PDF bill.');
    }
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