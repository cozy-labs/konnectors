'use strict';

var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');

var filterExisting = require('../lib/filter_existing');
var saveDataAndFile = require('../lib/save_data_and_file');
var localization = require('../lib/localization_manager');
var linkBankOperation = require('../lib/link_bank_operation');
var factory = require('../lib/base_konnector');

var Bill = require('../models/bill');

var logger = require('printit')({
  prefix: 'Materiel.net',
  date: true
});

var baseURL = 'https://www.materiel.net/';

var billsTableSelector = '#client table.EpCmdList';

var fileOptions = {
  vendor: 'Materiel.net',
  dateFormat: 'YYYYMMDD'
};

/**
 * @param {string} html
 * @return cheerio[]
 */
function extractBillsRows(html) {
  var $ = cheerio.load(html);
  var container = $(billsTableSelector);
  return container.find('tr[class^="Line"]').toArray().map(function (r) {
    return $(r);
  });
}

function fetchBillPageBillsList(options, cb) {
  request(options, function (err, res, body) {
    if (err) {
      logger.info('Could not fetch bills list from ' + options.url);
      return cb(null);
    }

    cb(extractBillsRows(body));
  });
}

// Login layer
function login(requiredFields, billInfos, data, next) {
  var signInOptions = {
    method: 'POST',
    jar: true,
    url: baseURL + 'pm/client/logincheck.nt.html',
    form: {
      login: requiredFields.login,
      pass: requiredFields.password
    }
  };

  var billsOptions = {
    method: 'GET',
    jar: true,
    url: baseURL + 'pm/client/commande.html'
  };

  logger.info('Signing in');
  request(signInOptions, function (err) {
    if (err) {
      logger.error('Signin failed');
      return next('bad credentials');
    }

    // Download bill information page.
    logger.info('Fetching bills list');
    request(billsOptions, function (err, res, body) {
      if (err) {
        logger.error('An error occured while fetching bills list');
        return next('no bills retrieved');
      }

      // Check if there are several pages
      var $ = cheerio.load(body);
      var otherPages = $(billsTableSelector + ' tr.EpListBLine td:first-child').text();
      var nbPagesPos = otherPages.lastIndexOf(' ') + 1;
      var nbPages = 1;
      if (nbPagesPos) {
        nbPages = parseInt(otherPages.substr(nbPagesPos), 10);
        if (isNaN(nbPages)) {
          nbPages = 1;
        }
      }

      // If there are are several pages, parse all the pages to retrieve all the
      // bills
      if (nbPages > 1) {
        (function () {
          var totalPagesParsed = 0;
          var billsList = $(billsTableSelector);
          var _fetchPageFromIndex = function _fetchPageFromIndex(idx) {
            var pageOptions = Object.create(billsOptions);
            pageOptions.url += '?page=' + idx;
            logger.info('Fetching page ' + idx + ' of ' + nbPages + '\u2026');
            fetchBillPageBillsList(pageOptions, function (rows) {
              // We now reinsert the rows in the first page's list
              if (rows) {
                billsList.append(rows);
              }

              if (++totalPagesParsed === nbPages - 1) {
                logger.info('All bills pages fetched');
                data.html = $.html();
                next();
              }
            });
          };

          for (var pageIndex = 2; pageIndex <= nbPages; ++pageIndex) {
            _fetchPageFromIndex(pageIndex);
          }
        })();
      } else {
        data.html = body;
        next();
      }
    });
  });
}

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];

  var rows = extractBillsRows(data.html);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = rows[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var row = _step.value;

      var cells = row.find('td');
      var ref = cells.eq(0).text().trim();
      var date = cells.eq(1).text().trim();
      var price = cells.eq(2).text().trim().replace(' €', '').replace(',', '.');
      var status = cells.eq(3).text().trim().toLowerCase();

      if (status === 'terminée' || status === 'commande expédiée') {
        var bill = {
          date: moment(date, 'DD/MM/YYYY'),
          amount: parseFloat(price),
          pdfurl: baseURL + 'pm/client/facture.nt.html?ref=' + ref
        };

        bills.fetched.push(bill);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  logger.info(bills.fetched.length + ' bill(s) retrieved');
  next();
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(requiredFields, entries, data, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.filtered && entries.filtered.length > 0) {
    entries.notifContent = localization.t('notification bills', {
      smart_count: entries.filtered.length
    });
  }

  next();
}

module.exports = factory.createNew({
  name: 'Materiel.net',
  description: 'konnector description materiel_net',
  vendorLink: baseURL,

  category: 'others',
  color: {
    hex: '#D2312D',
    css: '#D2312D'
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

  fetchOperations: [login, parsePage, customFilterExisting, customSaveDataAndFile, linkBankOperation({
    log: logger,
    minDateDelta: 1,
    maxDateDelta: 1,
    model: Bill,
    amountDelta: 0.1,
    identifier: ['materiel.net']
  }), buildNotifContent]
});