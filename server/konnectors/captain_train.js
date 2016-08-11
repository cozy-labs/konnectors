'use strict';

const baseKonnector = require('../lib/base_konnector');
const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');
const linkBankOperation = require('../lib/link_bank_operation');
const requestJson = require('request-json');
const request = require('request');
const moment = require('moment');

const Bill = require('../models/bill');
/* The goal of this connector is to fetch bills from the
service captaintrain.com */

const logger = require('printit')({
  prefix: 'Captaintrain',
  date: true,
});


module.exports = baseKonnector.createNew({
  name: 'Captain Train',

  fields: {
    login: 'email',
    password: 'password',
    folderPath: 'folder',
  },

  models: [Bill],

  fetchOperations: [
    login,
    fetchBills,
    customFilterExisting,
    customSaveDataAndFile,
    linkBankOperation({
      log: logger,
      minDateDelta: 1,
      maxDateDelta: 1,
      model: Bill,
      amountDelta: 0.1,
      identifier: ['CAPITAINE TRAIN', 'CAPTAIN TRAIN', 'OUIGO'],
    }),
    buildNotifContent,
  ],

});

const fileOptions = {
  vendor: 'Captaintrain',
  dateFormat: 'YYYYMMDD',
};

const baseUrl = 'https://www.captaintrain.com/';
const client = requestJson.createClient(baseUrl);
const userAgent = 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) ' +
                  'Gecko/20100101 Firefox/37.0';

client.headers['user-agent'] = userAgent;
function login(requiredFields, entries, data, next) {
  const options = {
    method: 'GET',
    url: `${baseUrl}signin`,
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    jar: true,
  };
  request(options, (err) => {
    if (err) {
      logger.error(err);
      return next(err);
    }

    // Signin form
    const signinForm = {
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
      user_itokend: null,
    };
    // Signin
    const signinPath = `${baseUrl}api/v5/account/signin`;
    client.post(signinPath, signinForm, (err, res, body) => {
      if (err) {
        logger.error(err);
        return next(err);
      }

      if (res.statusCode === 422) {
        return next('bad credentials');
      }
      // Retrieve token for json client
      const token = body.meta.token;
    //  client.headers.cookie = cookie;
      client.headers.Authorization = `Token token="${token}"`;
      data.authHeader = `Token token="${token}"`;
      // the api/v5/pnrs uri gives all information necessary to get bill
      // information
      client.get(`${baseUrl}api/v5/pnrs`, (err, res, body) => {
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
  const minDate = pnrs.reduce(
    (min, pnr) => Math.min(+min, +new Date(pnr.sort_date)), Infinity
  );
  return moment(minDate).subtract(1, 'month').set('date', 1)
                        .format('YYYY-MM-DD');
}


function getNextMetaData(startdate, data, callback) {
  client.get(`${baseUrl}api/v5/pnrs?date=${startdate}`, (err, res, body) => {
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
  const bills = [];
  // List of already managed proofs
  const managedProofId = [];
  for (const proof of data.proofs) {
    if (!proof.url) {
      // No need to go further.
      continue;
    }

    // The proof can be duplicated, we only manage the one which were not taken
    // care of already.
    if (managedProofId.indexOf(proof.id) !== -1) {
      // This proof is already dealt with
      continue;
    } else {
      // Add to the managed proof list
      managedProofId.push(proof.id);
    }

    // A bill can be linked to several pnrs, we retrieve all of them
    // For some unknown reason, some users don't have pnrs backlinked to
    // proofs, let's initialize the array with the one linked to the proof.
    let linkedPNR = [data.pnrs.find(pnr => pnr.id === proof.pnr_id)];
    try {
      linkedPNR = data.pnrs.filter(
        pnr => pnr.proof_ids.indexOf(proof.id) !== -1
      );
    } catch (e) {
      // We do nothing with the error as linkedPNR is set anyway.
      logger.error('linkedPNR');
      logger.error(e);
    }

    // For some unknown reason, some users don't have system set for the pnr.
    // By default we set it to sncf
    linkedPNR = linkedPNR.map(pnr => {
      if (typeof pnr.system === 'undefined') {
        pnr.system = 'sncf';
      }
      return pnr;
    });

    // We try to find the list of the systems. there will be one
    // bankoperation/proof/system
    const systems = linkedPNR.reduce((sys, pnr) => {
      if (sys.indexOf(pnr.system) === -1) {
        return sys.concat(pnr.system);
      }
      return sys;
    }, []);

    // Calculate the amount of each system because their is one operation per
    // system.
    for (const system of systems) {
      const bill = {
        pdfurl: proof.url,
        type: 'train',
        vendor: 'Captain Train',
        date: moment(proof.created_at).hours(0)
                                      .minutes(0)
                                      .seconds(0)
                                      .milliseconds(0),
      };

      // Get the list of refunds for the current bill
      let refundID = [];
      refundID = linkedPNR.filter(pnr => pnr.system === system).reduce(
        (list, pnr) => list.concat(pnr.after_sales_log_ids), []
      );
      let listRefund = [];
      listRefund = refundID.reduce((list, id) => list.concat(
        data.after_sales_logs.find(asl => asl.id === id)), []
      );


      if (proof.type === 'purchase') {
        // Compute the sum of refunds for the current bill
        const reinboursedAmount = listRefund.reduce(
          (sum, rb) => sum - rb.added_cents + rb.refunded_cents, 0
        );
        // We compute the amount of not reimbursed trips.
        const paidAmount =
          linkedPNR.filter(pnr => pnr.system === system).reduce(
            (sum, p) => sum + p.cents, 0
          );
        // Get the the sum of penalties
        const penaltiesAmount = listRefund.reduce(
          (sum, rb) => sum + rb.penalty_cents, 0);
        bill.amount = (paidAmount + reinboursedAmount + penaltiesAmount) / 100;
      } else {
        // Find the unique Refund based on the emission date
        const refund = listRefund.find(
          refund => refund.date === proof.created_at
        );
        bill.amount = (refund.refunded_cents - refund.added_cents) / 100;
        bill.isRefund = true;
      }

      bills.push(bill);
    }
  }

  entries.fetched = bills;
  next();
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['facture'])(
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

  next();
}
