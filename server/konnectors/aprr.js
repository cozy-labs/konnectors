/*
// This konnector retrieves invoices from french motorway company APRR
// website https://espaceclient.aprr.fr
// creation : 11/06/2016
// creator : https://github.com/SomeAverageDev
// this konnector works for customers having an automatic toll payment system
// also called "badge telepeage"
*/
'use strict';

const request = require('request').defaults({
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true,
});
const moment = require('moment');
const cheerio = require('cheerio');
const baseKonnector = require('../lib/base_konnector');

const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');
const linkBankOperation = require('../lib/link_bank_operation');
const Bill = require('../models/bill');
const log = require('printit')({
  prefix: 'APRR',
  date: true,
});

const fileOptions = {
  vendor: 'APRR',
  dateFormat: 'YYYYMMDD',
};

const baseUrl = 'https://espaceclient.aprr.fr/aprr/Pages';

// Konnector
const connector = module.exports = baseKonnector.createNew({
  name: 'APRR',
  vendorLink: baseUrl,
  fields: {
    login: 'text',
    password: 'password',
    folderPath: 'folder',
  },
  models: [Bill],
  fetchOperations: [
    getHiddenInputs,
    logIn,
    fetchBillingInfo,
    parsePage,
    customFilterExisting,
    customSaveDataAndFile,
    linkBankOperation({
      log,
      model: Bill,
      identifier: 'APRR AUTOROUTE',
      minDateDelta: 4,
      maxDateDelta: 20,
      amountDelta: 0.1,
    }),
    buildNotifContent,
  ],
});

// Procedure to get hidden inputs
function getHiddenInputs(requiredFields, bills, data, next) {
  const url = `${baseUrl}/connexion.aspx`;
  const options = {
    url,
    method: 'GET',
  };

  if (requiredFields.login.length === 0
      || requiredFields.password.length === 0) {
    next('bad credentials');
  } else {
    connector.logger.info('Getting the hidden inputs...');

    request(options, (err, res, body) => {
      const obj = {};
      if (err) {
        next(err);
      } else {
        const $ = cheerio.load(body);

        $('body').find('input[type=\'hidden\']').each(function a() {
          obj[$(this).attr('name')] = $(this).val();
        });

        // adding login/pwd
        obj.ctl00$PlaceHolderMain$TextBoxLogin = requiredFields.login;
        obj.ctl00$PlaceHolderMain$TextBoxPass = requiredFields.password;
        obj['ctl00$PlaceHolderMain$ImageButtonConnection.x'] =
          Math.floor((Math.random() * 10) + 1);
        obj['ctl00$PlaceHolderMain$ImageButtonConnection.y'] =
          Math.floor((Math.random() * 10) + 1);

        data.inputs = obj;

        next();
      }
      return true;
    });
  }
  return true;
}

// Procedure to login
function logIn(requiredFields, bills, data, next) {
  const options = {
    method: 'POST',
    url: `${baseUrl}/connexion.aspx`,
    form: data.inputs,
    headers: {
      Referer: `${baseUrl}/connexion.aspx`,
    },
  };

  connector.logger.info('Logging in on APRR website...');

  request(options, (err, res, body) => {
    let isLogged = true;
    if (err) {
      return next(err);
    }

    if (body.search('processus=login_fail') > -1) {
      isLogged = false;
    }

    if (isLogged) {
      connector.logger.info('Successfully logged in.');
    } else {
      log.error('Authentification error');
      log.debug(body);
      return next('bad credentials');
    }
    return next();
  });
  return true;
}

function fetchBillingInfo(requiredFields, bills, data, next) {
  const url = `${baseUrl}/MaConsommation/conso_factures.aspx`;

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
  return true;
}

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];
  moment.locale('fr');
  const $ = cheerio.load(data.html);

  $('table[class=tbl_factures] tr').each(function a() {
    const $tds = $(this).find('td');
    const billReference = $tds.eq(0).text().trim();
    let billDate = $tds.eq(1).text().trim();
    let billAmount = $tds.eq(2).text().trim();
    const billUrl = $tds.eq(3).html();

    if (billUrl && billReference && billDate && billAmount) {
      try {
        billAmount = parseFloat(((billAmount.match(/(\d+,\d+)/))[0])
                                            .replace(',', '.')
                                );

        const month = parseInt((
          billUrl.trim()
                 .match(/processus=facture_(\d+)_\d+/))[1], 10) - 1;

        billDate = billDate.split(' ');

        // invoices have no emitted day, so 28 of every month might fit
        const bill = {
          date: moment([billDate[1], month, 28]),
          type: 'Peage',
          amount: billAmount,
          pdfurl: `${baseUrl}/MaConsommation/conso_factures.aspx?` +
                  `facture=${billReference}`,
          vendor: 'APRR',
        };

        // saving bill
        bills.fetched.push(bill);
      } catch (e) {
        log.error('parsePage:', e);
        log.raw(e);
        return next(e);
      }
    }
    return true;
  });

  connector.logger.info('Successfully parsed the page, bills found:',
    bills.fetched.length);

  return next();
}

function customFilterExisting(requiredFields, bills, data, next) {
  return filterExisting(log, Bill)(requiredFields, bills, data, next);
}

function customSaveDataAndFile(requiredFields, bills, data, next) {
  const fnsave = saveDataAndFile(log, Bill, fileOptions, ['peage', 'facture']);
  return fnsave(requiredFields, bills, data, next);
}

function buildNotifContent(requiredFields, bills, data, next) {
  if (bills.filtered.length > 0) {
    const localizationKey = 'notification bills';
    const options = {
      smart_count: bills.filtered.length,
    };
    bills.notifContent = localization.t(localizationKey, options);
  }

  return next();
}
