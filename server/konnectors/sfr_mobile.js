'use strict';

const request = require('request').defaults({
  jar: true,
});
const moment = require('moment');
const cheerio = require('cheerio');
const baseKonnector = require('../lib/base_konnector');

const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');
const linkBankOperation = require('../lib/link_bank_operation');

const log = require('printit')({
  prefix: 'Sfr mobile',
  date: true,
});

const fileOptions = {
  vendor: 'SFR',
  dateFormat: 'YYYYMMDD',
};

const Bill = require('../models/bill');

// Konnector
const connector = module.exports = baseKonnector.createNew({
  name: 'SFR Mobile',
  fields: {
    login: 'text',
    password: 'password',
    folderPath: 'folder',
  },
  models: [Bill],
  fetchOperations: [
    getToken,
    logIn,
    fetchBillingInfo,
    parsePage,
    customFilterExisting,
    customSaveDataAndFile,
    linkBankOperation({
      log,
      model: Bill,
      identifier: 'SFR MOBILE',
      minDateDelta: 4,
      maxDateDelta: 20,
      amountDelta: 0.1,
    }),
    buildNotifContent,
  ],
});

// Procedure to get the login token
function getToken(requiredFields, bills, data, next) {
  const url = 'https://www.sfr.fr/bounce?target=//www.sfr.fr/sfr-et-moi/bounce.html&casforcetheme=mire-sfr-et-moi&mire_layer';
  const options = {
    url,
    method: 'GET',
  };

  connector.logger.info('Getting the token on Sfr Website...');

  request(options, (err, res, body) => {
    if (err) return next(err);

    const $ = cheerio.load(body);
    data.token = $('input[name=lt]').val();

    connector.logger.info('Token retrieved');
    return next();
  });
}

// Procedure to login to Sfr website.
function logIn(requiredFields, bills, data, next) {
  const options = {
    method: 'POST',
    url: 'https://www.sfr.fr/cas/login?domain=mire-sfr-et-moi&service=https://www.sfr.fr/accueil/j_spring_cas_security_check#sfrclicid=EC_mire_Me-Connecter',
    form: {
      lt: data.token,
      execution: 'e1s1',
      _eventId: 'submit',
      username: requiredFields.login,
      password: requiredFields.password,
      identifier: '',
    },
  };

  connector.logger.info('Logging in on Sfr website...');

  request(options, (err) => {
    if (err) return next(err);

    connector.logger.info('Successfully logged in.');
    return next();
  });
}

function fetchBillingInfo(requiredFields, bills, data, next) {
  const url = 'https://espace-client.sfr.fr/facture-mobile/consultation';

  connector.logger.info('Fetch bill info');
  const options = {
    method: 'GET',
    url,
  };
  request(options, (err, res, body) => {
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
  const $ = cheerio.load(data.html);
  const baseURL = 'https://espace-client.sfr.fr';

  const firstBill = $('#facture');
  const firstBillUrl = $('#lien-telecharger-pdf').attr('href');
  // The year is not provided, but we assume this is the current year or that
  // it will be provided if different from the current year
  let firstBillDate = firstBill.find('tr.header h3').text().substr(17);
  firstBillDate = moment(firstBillDate, 'D MMM YYYY');

  const price = firstBill.find('tr.total td.prix').text()
                                                .replace('€', '')
                                                .replace(',', '.');

  const bill = {
    date: firstBillDate,
    type: 'Mobile',
    amount: parseFloat(price),
    pdfurl: `${baseURL}${firstBillUrl}`,
    vendor: 'Sfr'
  };

  bills.fetched.push(bill);

  $('#tab tr').each(function each() {
    let date = $(this).find('.date').text();
    let prix = $(this).find('.prix').text()
                                    .replace('€', '')
                                    .replace(',', '.');
    let pdf = $(this).find('.liens a').attr('href');
    date = date.split(' ');
    date.pop();
    date = date.join(' ');
    date = moment(date, 'D MMM YYYY');
    prix = parseFloat(prix);
    pdf = `${baseURL}${pdf}`;

    const bill = {
      date,
      type: 'Mobile',
      amount: prix,
      pdfurl: pdf,
      vendor: 'Sfr',
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
  const fnsave = saveDataAndFile(log, Bill, fileOptions, ['bill']);
  fnsave(requiredFields, bills, data, next);
}

function buildNotifContent(requiredFields, bills, data, next) {
  if (bills.filtered.length > 0) {
    const localizationKey = 'notification bills';
    const options = {
      smart_count: bills.filtered.length,
    };
    bills.notifContent = localization.t(localizationKey, options);
  }

  next();
}
