'use strict';

var userAgent = 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0';
var request = require('request').defaults({
  jar: true,
  headers: {
    'User-Agent': userAgent
  }
});

var moment = require('moment');
var cheerio = require('cheerio');
var async = require('async');
var Pdf2json = require('pdf2json');
var baseKonnector = require('../lib/base_konnector');
var saveDataAndFile = require('../lib/save_data_and_file');
var linkBankOperation = require('../lib/link_bank_operation');
var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var Bill = require('../models/bill');
var log = require('printit')({
  prefix: 'Darty',
  date: true
});

var fileOptions = {
  vendor: 'Darty',
  dateFormat: 'YYYYMMDD'
};

var host = 'https://secure.darty.com';
var loginUrl = host + '/espace_client/connexion';
var billsListUrl = host + '/webapp/wcs/stores/controller/ec/orders';

function loginAndParseBillsList(fields, bills, data, next) {
  request(loginUrl, function (err) {
    if (err) {
      return next('request error');
    }
    // Do nothing with the body, it is just to get an initial cookie
    var options = {
      method: 'POST',
      url: loginUrl,
      form: {
        email: fields.login,
        password: fields.password
      }
    };
    request(options, function (err, res) {
      if (err) {
        log.error(err);
        return next('request error');
      }
      // TODO : Improve test;
      if (res.statusCode === 200) {
        return next('bad credentials');
      }
      log.info('Connected');
      request(billsListUrl, function (err, res, body) {
        if (err) {
          log.error(err);
          return next('request error');
        }
        var $ = cheerio.load(body);
        var billsList = [];

        $('div.darty_sous_bloc_new_ec').each(function (i, element) {
          var billId = $('div.darty_sous_bloc_header_spacing_new_ec > span.red', element).text().trim();
          billId = billId.replace(/( |\r\n|\/[A-Z]+)/g, '');

          var date = $('div > span.label > strong.red', element).text();
          var pdfurl = $('div.parc_facture_cell_new_ec > a.darty_sous_bloc_action_link_new_ec', element).attr('href');
          // Not all the orders on the website have a bill
          if (typeof pdfurl !== 'undefined') {
            billsList.push({
              number: billId,
              pdfurl: '' + host + pdfurl,
              date: moment(date.replace(/-.*/, '').trim(), 'DD/MM/YYYY'),
              type: 'shop'
            });
          }
        });
        bills.fetched = billsList;
        next();
      });
    });
  });
}

function parseAmountForBills(fields, bills, data, next) {
  var _this = this;

  // This function parses the bill to get the amount

  var billsList = bills.fetched;
  async.mapSeries(billsList, function (bill, callback) {
    var pdfurl = bill.pdfurl;
    var options = {
      method: 'GET',
      url: pdfurl,
      encoding: null
    };
    request(options, function (err, res, body) {
      if (err) {
        log.error(err);
        return callback('request error');
      }

      var pdfParser = new Pdf2json(_this, 1);
      pdfParser.on('pdfParser_dataError', function (errData) {
        log.error(errData.parserError);
        log.error('pdf parse error for bill ' + bill.number);
        return callback('parsing error');
      });
      pdfParser.on('pdfParser_dataReady', function () {
        log.info('pdf parsed for bill ' + bill.number);

        var rawContent = pdfParser.getRawTextContent();

        var line = rawContent.match(/Montant réglé par :[ A-Za-z]*([0-9,]+) *€/);
        if (line === null) {
          log.info('No amount found, please contact a maintainer');
          // We don't want to stop because we don't find an amount
          // We just skip this bill
          return callback(null, null);
        }
        var amount = line[1].replace(',', '.');

        bill.amount = amount;
        return callback(null, bill);
      });
      pdfParser.parseBuffer(body);
    });
  }, function (err, billsWithAmount) {
    if (err) {
      log.error(err);
      return next(err);
    }
    // Filter the null bills
    billsWithAmount = billsWithAmount.filter(function (bill) {
      return bill !== null;
    });
    log.info('Fetched ' + billsWithAmount.length + ' bills');
    bills.fetched = billsWithAmount;
    return next();
  });
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(log, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(log, Bill, fileOptions, ['facture'])(requiredFields, entries, data, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.filtered && entries.filtered.length > 0) {
    var localizationKey = 'notification bills';
    var options = {
      smart_count: entries.filtered.length
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  next();
}

module.exports = baseKonnector.createNew({
  name: 'Darty',
  vendorLink: 'http://www.darty.com',
  fields: {
    login: {
      type: 'email'
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

  fetchOperations: [loginAndParseBillsList, parseAmountForBills, customFilterExisting, customSaveDataAndFile, buildNotifContent, linkBankOperation({
    log: log,
    minDateDelta: 1,
    maxDateDelta: 1,
    model: Bill,
    amountDelta: 0.1,
    identifier: 'DARTY'
  })]
});