'use strict';

var baseKonnector = require('../lib/base_konnector');
var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');
var linkBankOperation = require('../lib/link_bank_operation');
var requestJson = require('request-json');
var request = require('request');
var moment = require('moment');

var Bill = require('../models/bill');
/* The goal of this connector is to fetch bills from the
service captaintrain.com */

var logger = require('printit')({
  prefix: 'Captaintrain',
  date: true
});

module.exports = baseKonnector.createNew({
  name: 'Trainline',
  vendorLink: 'www.captaintrain.com',

  category: 'transport',
  color: {
    hex: '#48D5B5',
    css: '#48D5B5'
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

  fetchOperations: [login, fetchBills, customFilterExisting, customSaveDataAndFile, linkBankOperation({
    log: logger,
    minDateDelta: 1,
    maxDateDelta: 1,
    model: Bill,
    amountDelta: 0.1,
    identifier: ['CAPITAINE TRAIN', 'CAPTAIN TRAIN', 'OUIGO', 'TRAINLINE']
  }), buildNotifContent]

});

var fileOptions = {
  vendor: 'Captaintrain',
  dateFormat: 'YYYYMMDD'
};

var baseUrl = 'https://www.captaintrain.com/';
var client = requestJson.createClient(baseUrl);
var userAgent = 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) ' + 'Gecko/20100101 Firefox/37.0';

client.headers['user-agent'] = userAgent;
function login(requiredFields, entries, data, next) {
  var options = {
    method: 'GET',
    url: baseUrl + 'signin',
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    jar: true
  };
  request(options, function (err) {
    if (err) {
      logger.error(err);
      return next(err);
    }

    // Signin form
    var signinForm = {
      concur_auth_code: null,
      concur_migration_type: null,
      concur_new_email: null,
      correlation_key: null,
      email: requiredFields.login,
      facebook_id: null,
      facebook_token: null,
      google_code: null,
      google_id: null,
      password: requiredFields.password,
      source: null,
      user_itokend: null
    };
    // Signin
    var signinPath = baseUrl + 'api/v5/account/signin';
    client.post(signinPath, signinForm, function (err, res, body) {
      if (err) {
        logger.error(err);
        return next(err);
      }
      logger.info('Connected');
      if (res.statusCode === 422) {
        return next('bad credentials');
      }
      // Retrieve token for json client
      var token = body.meta.token;
      //  client.headers.cookie = cookie;
      client.headers.Authorization = 'Token token="' + token + '"';
      data.authHeader = 'Token token="' + token + '"';
      // the api/v5/pnrs uri gives all information necessary to get bill
      // information
      client.get(baseUrl + 'api/v5/pnrs', function (err, res, body) {
        if (err) {
          logger.error(err);
          return next(err);
        }
        // We check there are bills
        if (body.proofs && body.proofs.length > 0) {
          saveMetadata(data, body);
          getNextMetaData(computeNextDate(body.pnrs), data, next);
        } else {
          return next();
        }
      });
    });
  });
}

function computeNextDate(pnrs) {
  // To get new bills, it is necessary to get api/v5/pnrs?date=YYYY-MM-DD
  // This function computes the date YYYY-MM-DD
  // YYYY-MM-DD :
  //    - DD: always 1
  //    - MM: month before the month of the youngest received pnr
  //    - YY: year of the first month before the youngest received pnr

  // Indentify the minimum date in the pnr list
  var minDate = pnrs.reduce(function (min, pnr) {
    return Math.min(+min, +new Date(pnr.sort_date));
  }, Infinity);
  return moment(minDate).subtract(1, 'month').set('date', 1).format('YYYY-MM-DD');
}

function getNextMetaData(startdate, data, callback) {
  client.get(baseUrl + 'api/v5/pnrs?date=' + startdate, function (err, res, body) {
    if (err) {
      logger.error(err);
      return callback(err);
    }
    if (body.proofs && body.proofs.length > 0) {
      saveMetadata(data, body);
      getNextMetaData(computeNextDate(body.pnrs), data, callback);
    } else {
      callback();
    }
  });
}

function saveMetadata(data, body) {
  // Body structure received for api/v5/pnrs (with or without date parameter)
  //
  // body.pnrs (table of pnr):
  //  - id: unique identifier
  //  - sort_date: creation date
  //  - system: payment system, defines the label of operation. Default is sncf.
  //  - after_sales_log_ids: list of ids of related refunds
  //  - proof_ids: list of ids of related bills
  //  - cent: amount in cents
  //
  // body.proofs (table of bills):
  //  - id: unique identifier
  //  - url: url of the bill
  //  - created_at: creation date of the bill
  //  - type: type of operation ('purchase' or 'refund')
  //
  // body.after_sales_logs (table of refunds):
  //  - id: unique identifier
  //  - added_cents: extr expense for the refund
  //  - refunded_cents: amount of reinbursment
  //  - penalty_cents: amount penalty
  //  - date
  //
  if (typeof data.proofs === 'undefined') {
    data.proofs = [];
  }
  data.proofs = data.proofs.concat(body.proofs);

  if (typeof data.pnrs === 'undefined') {
    data.pnrs = [];
  }
  data.pnrs = data.pnrs.concat(body.pnrs);

  if (typeof data.folders === 'undefined') {
    data.folders = [];
  }
  data.folders = data.folders.concat(body.folders);

  if (typeof data.after_sales_logs === 'undefined') {
    data.after_sales_logs = [];
  }
  data.after_sales_logs = data.after_sales_logs.concat(body.after_sales_logs);
}

function fetchBills(requiredFields, entries, data, next) {
  var bills = [];
  // List of already managed proofs
  var managedProofId = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    var _loop = function _loop() {
      var proof = _step.value;

      if (!proof.url) {
        // No need to go further.
        return 'continue';
      }

      // The proof can be duplicated, we only manage the one which were not taken
      // care of already.
      if (managedProofId.indexOf(proof.id) !== -1) {
        // This proof is already dealt with
        return 'continue';
      } else {
        // Add to the managed proof list
        managedProofId.push(proof.id);
      }

      // A bill can be linked to several pnrs, we retrieve all of them
      // For some unknown reason, some users don't have pnrs backlinked to
      // proofs, let's initialize the array with the one linked to the proof.
      var linkedPNR = [data.pnrs.find(function (pnr) {
        return pnr.id === proof.pnr_id;
      })];
      try {
        linkedPNR = data.pnrs.filter(function (pnr) {
          return pnr.proof_ids instanceof Array && pnr.proof_ids.indexOf(proof.id) !== -1;
        });
      } catch (e) {
        // We do nothing with the error as linkedPNR is set anyway.
        logger.error('linkedPNR');
        logger.error(e);
      }

      // For some unknown reason, some users don't have system set for the pnr.
      // By default we set it to sncf
      linkedPNR = linkedPNR.map(function (pnr) {
        if (typeof pnr.system === 'undefined') {
          pnr.system = 'sncf';
        }
        return pnr;
      });

      // We try to find the list of the systems. there will be one
      // bankoperation/proof/system
      var systems = linkedPNR.reduce(function (sys, pnr) {
        if (sys.indexOf(pnr.system) === -1) {
          return sys.concat(pnr.system);
        }
        return sys;
      }, []);

      // Calculate the amount of each system because their is one operation per
      // system.
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        var _loop2 = function _loop2() {
          var system = _step3.value;

          var bill = {
            pdfurl: proof.url,
            type: 'train',
            vendor: 'Captain Train',
            system: system,
            date: moment(proof.created_at).hours(0).minutes(0).seconds(0).milliseconds(0)
          };

          // Get the list of refunds for the current bill
          var refundID = [];
          refundID = linkedPNR.filter(function (pnr) {
            return pnr.system === system;
          }).reduce(function (list, pnr) {
            return list.concat(pnr.after_sales_log_ids);
          }, []);
          var listRefund = [];
          listRefund = refundID.reduce(function (list, id) {
            return list.concat(data.after_sales_logs.find(function (asl) {
              return asl.id === id;
            }));
          }, []);

          if (proof.type === 'purchase') {
            // Compute the sum of refunds for the current bill
            var reinboursedAmount = listRefund.reduce(function (sum, rb) {
              return sum - rb.added_cents + rb.refunded_cents;
            }, 0);
            // We compute the amount of not reimbursed trips.
            var paidAmount = linkedPNR.filter(function (pnr) {
              return pnr.system === system;
            }).reduce(function (sum, p) {
              return sum + p.cents;
            }, 0);
            // Get the the sum of penalties
            var penaltiesAmount = listRefund.reduce(function (sum, rb) {
              return sum + rb.penalty_cents;
            }, 0);
            bill.amount = (paidAmount + reinboursedAmount + penaltiesAmount) / 100;
          } else {
            // Find the unique Refund based on the emission date
            var refund = listRefund.find(function (refund) {
              return refund.date === proof.created_at;
            });
            bill.amount = (refund.refunded_cents - refund.added_cents) / 100;
            bill.isRefund = true;
          }

          bills.push(bill);
        };

        for (var _iterator3 = systems[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          _loop2();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    };

    for (var _iterator = data.proofs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _ret = _loop();

      if (_ret === 'continue') continue;
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

  var filteredBills = [];
  // Recombine the bill list so that each entry.url is unique
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    var _loop3 = function _loop3() {
      var bill = _step2.value;

      // Ensure the bill is not already in the list.
      var sameUrlBills = filteredBills.filter(function (b) {
        return b.pdfurl === bill.pdfurl && b.system === bill.system;
      });
      if (sameUrlBills.length === 0) {
        var sameBill = bills.filter(function (b) {
          return b.pdfurl === bill.pdfurl;
        }).filter(function (b) {
          return b.system === bill.system;
        });
        var newBill = {
          amount: sameBill.reduce(function (amount, b) {
            return amount + b.amount;
          }, 0),
          pdfurl: bill.pdfurl,
          date: bill.date,
          type: 'train',
          vendor: 'Captain Train'
        };
        if (typeof bill.isRefund !== 'undefined') {
          newBill.isRefund = bill.isRefund;
        }
        filteredBills.push(newBill);
      }
    };

    for (var _iterator2 = bills[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      _loop3();
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  entries.fetched = filteredBills;
  next();
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['facture'])(requiredFields, entries, data, next);
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