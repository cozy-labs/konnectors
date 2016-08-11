'use strict';
const request = require('request');
const cheerio = require('cheerio');
const async = require('async');

const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');
const linkBankOperation = require('../lib/link_bank_operation');

const baseKonnector = require('../lib/base_konnector');

const log = require('printit')({
  prefix: 'Uber',
  date: true,
});

const Bill = require('../models/bill');

const fileOptions = {
  vendor: 'UBER',
  dateFormat: 'YYYYMMDD',
};

module.exports = baseKonnector.createNew({
  name: 'Uber',
  fields: {
    login: 'text',
    password: 'password',
    folderPath: 'folder',
  },
  models: [Bill],
  fetchOperations: [
    logIn,
    getTrips,
    customFilterExisting,
    customSaveDataAndFile,
    logOut,
    linkBankOperation({
      log,
      minDateDelta: 1,
      maxDateDelta: 1,
      model: Bill,
      amountDelta: 0.1,
      identifier: 'UBER',
    }),
    buildNotifContent,
  ],
});

function logIn(requiredFields, bills, data, next) {
  const logInOptions = {
    method: 'GET',
    jar: true,
    url: 'https://login.uber.com/login',
  };
  request(logInOptions, (err, res, body) => {
    if (err) return next(err);

    const $ = cheerio.load(body);
    const token = $('input[name=_csrf_token]').val();

    const signInOptions = {
      method: 'POST',
      jar: true,
      url: 'https://login.uber.com/login',
      form: {
        email: requiredFields.login,
        password: requiredFields.password,
        _csrf_token: token,
      },
    };

    log.info('Logging in');

    return request(signInOptions, (err, res) => {
      if (err) {
        log.error('Login failed');
        log.raw(err);
        return next(err);
      }
      if (res.statuCode >= 400) {
        log.error('Login failed');
        const err = `Status code: ${res.statusCode}`;
        log.error(err);
        return next(err);
      }
      log.info('Login succeeded');
      log.info('Fetch trips info');

      const tripsOptions = {
        method: 'GET',
        jar: true,
        url: 'https://riders.uber.com/trips',
      };
      return request(tripsOptions, (err, res, body) => {
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
  let $ = cheerio.load(data.tripsPage);
  const tripsId = $('tbody .trip-expand__origin')
                  .map((i, element) => $(element).data('target'))
                  .get()
                  .map(trip => trip.replace('#trip-', ''));
  log.info(`Found ${tripsId.length} uber trips`);
  const fetchedBills = [];
  async.eachSeries(tripsId, (tripId, callback) => {
    const tripOption = {
      method: 'GET',
      jar: true,
      url: `https://riders.uber.com/trips/${tripId}`,
    };
    return request(tripOption, (err, res, body) => {
      if (err) {
        log.err('Failed to get trip information');
        log.raw(err);
        return callback(err);
      }
      $ = cheerio.load(body);
      const amount = $('td[class="text--right alpha weight--semibold"]')
                    .text()
                    .replace('€', '')
                    .replace(',', '.')
                    .trim();
      const billUrlOptions = {
        jar: true,
        method: 'GET',
        url: `https://riders.uber.com/get_invoices?q={"trip_uuid":"${tripId}"}`,
      };
      return request(billUrlOptions, (err, res, body) => {
        if (err) {
          log.err('Failed to get bill url');
          log.raw(err);
          return callback(err);
        }
        if (res.statusCode >= 400) {
          log.info(`No bill for this trip (${tripId})`);
          return callback();
        }
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          log.err(e);
          return callback(e);
        }
        // This can be due to a cancelled trip.
        if (parsedBody.length === 0) {
          log.info(`No bill for this trip (${tripId})`);
          return callback();
        }

        const bill = {
          date: new Date(parsedBody[0].invoice_date),
          amount: parseFloat(amount),
          type: 'Taxi',
          pdfurl: `https://riders.uber.com/invoice-gen${parsedBody[0].document_path}`,
          vendor: 'Uber',
        };
        fetchedBills.push(bill);
        return callback();
      });
    });
  }, (err) => {
    if (err) {
      return next(err);
    }
    bills.fetched = fetchedBills;
    log.info('Bills succesfully fetched');
    return next();
  });
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(log, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(log, Bill, fileOptions, ['facture'])(
      requiredFields, entries, data, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.filtered && entries.filtered.length > 0) {
    const localizationKey = 'notification bills';
    const options = {
      smart_count: entries.filtered.length,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  return next();
}

function logOut(requiredFields, entries, data, next) {
  const options = {
    methods: 'GET',
    jar: true,
    url: 'https://riders.uber.com/logout',
  };
  request(options, (err) => {
    if (err) {
      log.err('Failed to logout');
      log.raw(err);
      return next(err);
    }
    log.info('Succesfully logged out');
    return next();
  });
}
