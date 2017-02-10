'use strict';

var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var moment = require('moment');
var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');
var linkBankOperation = require('../lib/link_bank_operation');

var baseKonnector = require('../lib/base_konnector');

var log = require('printit')({
  prefix: 'Uber',
  date: true
});

var Bill = require('../models/bill');

var fileOptions = {
  vendor: 'UBER',
  dateFormat: 'YYYYMMDD'
};

module.exports = baseKonnector.createNew({
  name: 'Uber',
  vendorLink: 'https://uber.com',
  category: 'transport',
  color: {
    hex: '#000203',
    css: '#000203'
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
  fetchOperations: [logIn, getTrips, customFilterExisting, customSaveDataAndFile, logOut, linkBankOperation({
    log: log,
    minDateDelta: 1,
    maxDateDelta: 1,
    model: Bill,
    amountDelta: 0.1,
    identifier: 'UBER'
  }), buildNotifContent]
});

function logIn(requiredFields, bills, data, next) {
  var logInOptions = {
    method: 'GET',
    jar: true,
    url: 'https://login.uber.com/login'
  };
  request(logInOptions, function (err, res, body) {
    if (err) return next(err);

    var $ = cheerio.load(body);
    var token = $('input[name=_csrf_token]').val();

    var signInOptions = {
      method: 'POST',
      jar: true,
      url: 'https://login.uber.com/login',
      form: {
        email: requiredFields.login,
        password: requiredFields.password,
        _csrf_token: token
      }
    };

    log.info('Logging in');

    return request(signInOptions, function (err, res) {
      if (err) {
        log.error('Login failed');
        log.raw(err);
        return next(err);
      }
      if (res.statuCode >= 400) {
        log.error('Login failed');
        var _err = 'Status code: ' + res.statusCode;
        log.error(_err);
        return next(_err);
      }
      log.info('Login succeeded');
      log.info('Fetch trips info');

      var tripsOptions = {
        method: 'GET',
        jar: true,
        url: 'https://riders.uber.com/trips'
      };
      return request(tripsOptions, function (err, res, body) {
        if (err) {
          log.error('An error occured while fetching trips information');
          log.raw(err);
          return next(err);
        }
        log.info('Fetch trips information succeded');
        data.tripsPage = body;
        return next();
      });
    });
  });
}

function getTrips(requiredFields, bills, data, next) {
  var $ = cheerio.load(data.tripsPage);
  var tripsId = $('tbody .trip-expand__origin').map(function (i, element) {
    return $(element).data('target');
  }).get().map(function (trip) {
    return trip.replace('#trip-', '');
  });
  log.info('Found ' + tripsId.length + ' uber trips');
  var maybeNext = $('a.btn.pagination__next').attr('href');

  log.info('Found ' + tripsId.length + ' uber trips');
  var fetchedBills = [];
  async.eachSeries(tripsId, function (tripId, callback) {
    var tripOption = {
      method: 'GET',
      jar: true,
      url: 'https://riders.uber.com/trips/' + tripId
    };
    return request(tripOption, function (err, res, body) {
      if (err) {
        log.err('Failed to get trip information');
        log.raw(err);
        return callback(err);
      }
      $ = cheerio.load(body);
      var amount = $('td[class="text--right alpha weight--semibold"]').text().replace('€', '').replace(',', '.').trim();
      var billUrlOptions = {
        jar: true,
        method: 'GET',
        url: 'https://riders.uber.com/get_invoices?q={"trip_uuid":"' + tripId + '"}'
      };
      return request(billUrlOptions, function (err, res, body) {
        if (err) {
          log.err('Failed to get bill url');
          log.raw(err);
          return callback(err);
        }
        if (res.statusCode >= 400) {
          log.info('No bill for this trip (' + tripId + ')');
          return callback();
        }
        var parsedBody = void 0;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          log.err(e);
          return callback(e);
        }
        // This can be due to a cancelled trip.
        if (parsedBody.length === 0) {
          log.info('No bill for this trip (' + tripId + ')');
          return callback();
        }

        var bill = {
          date: moment(new Date(parsedBody[0].invoice_date)),
          amount: parseFloat(amount),
          type: 'Taxi',
          pdfurl: 'https://riders.uber.com/invoice-gen' + parsedBody[0].document_path,
          vendor: 'Uber'
        };
        fetchedBills.push(bill);
        return callback();
      });
    });
  }, function (err) {
    if (err) {
      return next(err);
    }
    if (typeof bills.fetched === 'undefined') {
      bills.fetched = fetchedBills;
    } else {
      bills.fetched.concat(fetchedBills);
    }

    // Check if there is a next page
    if (typeof maybeNext !== 'undefined') {
      return request('https://riders.uber.com/trips' + maybeNext, function (err, res, body) {
        if (err) {
          log.error(err);
          return next('request error');
        }
        data.tripsPage = body;
        return getTrips(requiredFields, bills, data, next);
      });
    }
    log.info('Bills succesfully fetched');
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

  return next();
}

function logOut(requiredFields, entries, data, next) {
  var options = {
    methods: 'GET',
    jar: true,
    url: 'https://riders.uber.com/logout'
  };
  request(options, function (err) {
    if (err) {
      log.err('Failed to logout');
      log.raw(err);
      return next(err);
    }
    log.info('Succesfully logged out');
    return next();
  });
}