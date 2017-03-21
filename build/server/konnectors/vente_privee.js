/*
// This konnector retrieves invoices from website http://fr.vente-privee.com
// creation : 11/06/2016
// creator : https://github.com/SomeAverageDev
*/
'use strict';

var saveOnlyLastBill = false;

var request = require('request').defaults({
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true,
  headers: {
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) ' + 'Gecko/20100101 Firefox/47.0'
  }
});

var moment = require('moment');
var cheerio = require('cheerio');
var baseKonnector = require('../lib/base_konnector');

var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');
var linkBankOperation = require('../lib/link_bank_operation');
var Bill = require('../models/bill');
var log = require('printit')({
  prefix: 'vente-privee',
  date: true
});

var fileOptions = {
  vendor: 'vente-privee',
  dateFormat: 'YYYYMMDD'
};

var baseUrl = 'https://secure.fr.vente-privee.com';

// Konnector
var connector = module.exports = baseKonnector.createNew({
  name: 'Vente-Privée',
  vendorLink: baseUrl,
  category: 'others',
  color: {
    hex: '#E8308A',
    css: '#E8308A'
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
  fetchOperations: [getHiddenInputs, logIn, parsePage, customFilterExisting, customSaveDataAndFile, linkBankOperation({
    log: log,
    model: Bill,
    identifier: ['VENTE PRIVEE.COM', 'WWW.VENTE-PRIVEE.COM'],
    minDateDelta: 4,
    maxDateDelta: 20,
    amountDelta: 0.1
  }), buildNotifContent, logOut]
});

// Procedure to get hidden inputs
function getHiddenInputs(requiredFields, bills, data, next) {
  var url = baseUrl + '/authentication/login/' + 'FR?ReturnUrl=%2fmemberaccount%2forder';
  var options = {
    url: url,
    method: 'GET'
  };

  if (requiredFields.login.length === 0 || requiredFields.password.length === 0) {
    next('bad credentials');
  } else {
    connector.logger.info('Getting the hidden inputs...');

    request(options, function (err, res, body) {
      var obj = {};
      if (err) {
        next(err);
      } else {
        var $ = cheerio.load(body);

        $('body').find('input[type=\'hidden\']').each(function a() {
          obj[$(this).attr('name')] = $(this).val();
        });

        // adding login/pwd
        obj['PortalTheme.CountryTheme.CouleurTexte'] = 'black';
        obj.Mail = requiredFields.login;
        obj.Password = requiredFields.password;

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
  var options = {
    method: 'POST',
    url: baseUrl + '/authentication/login/' + 'FR?ReturnUrl=%2fmemberaccount%2forder',
    form: data.inputs,
    headers: {
      Referer: baseUrl + '/authentication/login/' + 'FR?ReturnUrl=%2fmemberaccount%2forder'
    }
  };

  connector.logger.info('Logging in on VentePrivee website...');

  request(options, function (err, res, body) {
    var isLogged = true;

    if (err != null) {
      log.error(err);
      isLogged = false;
    }
    if (res.statusCode !== 200) {
      log.debug('statusCode != 200');
      isLogged = false;
    }
    if (body.search('authenticationForm') > 0) {
      log.debug('body.search:authenticationForm');
      isLogged = false;
    }

    if (isLogged) {
      connector.logger.info('Successfully logged in.');
    } else {
      log.error('Authentification error');
      log.debug('options:', JSON.stringify(options, null, 4));
      log.debug('headers:', JSON.stringify(res.headers, null, 4));
      log.debug(body);
      return next('bad credentials');
    }

    data.html = body;

    connector.logger.info('Successfully logged in.');
    return next();
  });
  return true;
}

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];
  moment.locale('fr');
  var $ = cheerio.load(data.html);
  var lastBill = null;

  $('#ordersTable tr').each(function a() {
    var orderId = null;
    var orderDate = null;
    var orderAmount = null;
    var matchs = null;

    var trId = $(this).attr('id');
    log.debug('trId:', trId);

    if (typeof trId === 'undefined') {
      return true;
    }

    matchs = trId.match(/orderBloc_(\d+)/);

    if (matchs) {
      orderId = matchs[1];
      log.debug('orderId:', orderId);

      var $tds = $(this).find('td');

      orderDate = $tds.eq(1).text().trim();
      orderAmount = $tds.eq(2).text().trim();
      try {
        orderAmount = parseFloat(orderAmount.match(/(\d+,\d+)/)[0].replace(',', '.'));
      } catch (e) {
        log.error('parseFloat error:', e);
        orderAmount = 0;
      }

      log.debug('orderDate:', orderDate);
      log.debug('orderAmount:', orderAmount);
      log.debug('url:', baseUrl + '/memberaccount/order/invoice?orderId=' + orderId);

      var bill = {
        date: moment(orderDate, 'DD/MM/YY'),
        type: 'shop',
        amount: orderAmount,
        pdfurl: baseUrl + '/memberaccount/order/invoice?orderId=' + orderId,
        vendor: 'vente-privee.com'
      };

      if (lastBill == null) {
        lastBill = Object.assign(bill);
      } else if (bill.date > lastBill.date) {
        lastBill = Object.assign(bill);
      }

      if (!saveOnlyLastBill) {
        // saving current bill
        bills.fetched.push(bill);
      }
    }
    return true;
  });

  if (saveOnlyLastBill) {
    bills.fetched.push(lastBill);
  }

  log.debug('bills.fetched:', bills);

  connector.logger.info('Successfully parsed the page, bills found:', bills.fetched.length);
  return next();
}

function customFilterExisting(requiredFields, bills, data, next) {
  log.debug('customFilterExisting');
  return filterExisting(log, Bill)(requiredFields, bills, data, next);
}

function customSaveDataAndFile(requiredFields, bills, data, next) {
  log.debug('customSaveDataAndFile');
  var fnsave = saveDataAndFile(log, Bill, fileOptions, ['vente-privee', 'facture']);
  return fnsave(requiredFields, bills, data, next);
}

function buildNotifContent(requiredFields, bills, data, next) {
  log.debug('buildNotifContent');
  if (bills.filtered.length > 0) {
    var localizationKey = 'notification bills';
    var options = {
      smart_count: bills.filtered.length
    };
    bills.notifContent = localization.t(localizationKey, options);
  }
  return next();
}

function logOut(requiredFields, bills, data, next) {
  var url = baseUrl + '/vp4/Login/Logout.ashx';
  var options = {
    method: 'GET',
    url: url
  };

  request(options, function (err) {
    if (err) {
      log.error(err);
      return next(err);
    }
    return next();
  });
  connector.logger.info('Successfully logout');
  return true;
}