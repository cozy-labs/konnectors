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
  prefix: 'Materiel.net',
  date: true
});

const baseURL = 'https://www.materiel.net/';

const fileOptions = {
  vendor: 'Materiel.net',
  dateFormat: 'YYYYMMDD',
};

// Login layer
function login(requiredFields, billInfos, data, next) {
  const signInOptions = {
    method: 'POST',
    jar: true,
    url: `${baseURL}pm/client/logincheck.nt.html`,
    form: {
      login: requiredFields.login,
      pass: requiredFields.password
    }
  };

  const billsOptions = {
    method: 'GET',
    jar: true,
    url: `${baseURL}pm/client/commande.html`,
  };

  logger.info('Signing in');
  request(signInOptions, (err) => {
    if (err) {
      logger.error('Signin failed');
      return next('bad credentials');
    }

    // Download bill information page.
    logger.info('Fetching bills list');
    request(billsOptions, (err, res, body) => {
      if (err) {
        logger.error('An error occured while fetching bills list');
        return next('no bills retrieved');
      }

      // TODO: check the other pages

      data.html = body;
      next();
    });
  });
}

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];

  const $ = cheerio.load(data.html);
  const container = $('#client');

  container.find('table.EpCmdList tr[class^="Line"]').each((idx, element) => {
    const cells = $(element).find('td');
    const ref = cells.eq(0).text().trim();
    const date = cells.eq(1).text().trim();
    const price = cells.eq(2).text().trim()
                           .replace(' €', '')
                           .replace(',', '.');
    const status = cells.eq(3).text()
                            .trim()
                            .toLowerCase();

    if ((status === 'terminée') || (status === 'commande expédiée')) {
      const bill = {
        date: moment(date, 'DD/MM/YYYY'),
        amount: parseFloat(price),
        pdfurl: `${baseURL}pm/client/facture.nt.html?ref=${ref}`
      };

      bills.fetched.push(bill);
    }
  });

  logger.info(`${bills.fetched.length} bill(s) retrieved`);
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
  name: 'Materiel_net',
  description: 'konnector description materiel_net',
  vendorLink: baseURL,

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
      identifier: ['materiel.net']
    }),
    buildNotifContent
  ]
});
