'use strict';

/* global emit */

var cozydb = require('cozydb');
var request = require('request').defaults({
  jar: true
});
var moment = require('moment');
var cheerio = require('cheerio');

var fetcher = require('../lib/fetcher');
var filterExisting = require('../lib/filter_existing');
var saveDataAndFile = require('../lib/save_data_and_file');
var localization = require('../lib/localization_manager');
var linkBankOperation = require('../lib/link_bank_operation');

var log = require('printit')({
  prefix: 'Sfr',
  date: true
});

var Bill = cozydb.getModel('Bill', {
  date: Date,
  type: String,
  vendor: String,
  amount: Number,
  fileId: String,
  binaryId: String,
  pdfurl: String
});

Bill.all = function (callback) {
  Bill.request('byDate', callback);
};

// Konnector

module.exports = {
  name: 'Sfr box',
  slug: 'sfrbox',
  description: 'konnector description sfr box',
  vendorLink: 'https://www.sfr.fr/',
  fields: {
    login: 'text',
    password: 'password',
    folderPath: 'folder'
  },
  models: {
    bill: Bill
  },

  // Define model requests.
  init: function init(callback) {
    Bill.defineRequest('byDate', function (doc) {
      emit(doc.date, doc);
    }, function (err) {
      callback(err);
    });
  },
  fetch: function fetch(requiredFields, callback) {
    log.info('Import started');
    fetcher.new().use(getToken).use(logIn).use(fetchBillingInfo).use(parsePage).use(filterExisting(log, Bill)).use(saveDataAndFile(log, Bill, 'sfr', ['facture'])).use(linkBankOperation, {
      log: log,
      model: Bill,
      identifier: 'SFR',
      minDateDelta: 4,
      maxDateDelta: 20,
      amountDelta: 0.1
    }).args(requiredFields, {}, {}).fetch(function (err, fields, entries) {
      var notifContent = void 0;
      var localizationKey = void 0;
      var options = void 0;
      if (err) return callback(err);

      log.info('Import finished');

      // TODO move this in a procedure.
      if (entries && entries.filtered && entries.filtered.length > 0) {
        localizationKey = 'notification sfr box';
        options = { smart_count: entries.filtered.length };
        notifContent = localization.t(localizationKey, options);
      }

      return callback(null, notifContent);
    });
  }
};

// Procedure to get the login token
function getToken(requiredFields, bills, data, next) {
  var url = 'https://www.sfr.fr/bounce?target=//www.sfr.fr/sfr-et-moi/bounce.html&casforcetheme=mire-sfr-et-moi&mire_layer';
  var options = {
    url: url,
    method: 'GET'
  };

  log.info('Getting the token on Sfr Website...');

  request(options, function (err, res, body) {
    if (err) return next(err);

    var $ = cheerio.load(body);
    data.token = $('input[name=lt]').val();

    log.info('Token retrieved');
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

  log.info('Logging in on Sfr website...');

  request(options, function (err) {
    if (err) return next(err);

    log.info('Successfully logged in.');
    return next();
  });
}

function fetchBillingInfo(requiredFields, bills, data, next) {
  var url = 'https://espace-client.sfr.fr/facture-fixe/consultation';

  log.info('Fetch bill info');
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
    log.info('Fetch bill info succeeded');

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
  log.info('Successfully parsed the page');
  next();
}