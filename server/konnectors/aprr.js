'use strict';

const request = require('request').defaults({
  jar: true,
  rejectUnauthorized: false,
  followAllRedirects: true   // allow redirections
});
const moment = require('moment');
const cheerio = require('cheerio');
const baseKonnector = require('../lib/base_konnector');

const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');
const linkBankOperation = require('../lib/link_bank_operation');

const log = require('printit')({
  prefix: 'APRR',
  date: true,
});

const fileOptions = {
  vendor: 'APRR',
  dateFormat: 'YYYYMMDD',
};

const Bill = require('../models/bill');

// Konnector
const connector = module.exports = baseKonnector.createNew({
  name: 'APRR',
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
      identifier: 'APRR',
      minDateDelta: 4,
      maxDateDelta: 20,
      amountDelta: 0.1,
    }),
    buildNotifContent,
  ],
});

// Procedure to get hidden inputs
function getHiddenInputs(requiredFields, bills, data, next) {
  const url = 'https://espaceclient.aprr.fr/aprr/Pages/connexion.aspx';
  const options = {
    url,
    method: 'GET',
  };

  connector.logger.info('Getting the hidden inputs...');

  request(options, (err, res, body) => {
    if (err) return next(err);

    const $ = cheerio.load(body);

    var obj = {};
    $( "body" ).find("input[type='hidden']").each(function(){
		obj[$(this).attr('name')] = $(this).val();
	});

	// adding login/pwd
	obj['ctl00$PlaceHolderMain$TextBoxLogin'] = requiredFields.login;
	obj['ctl00$PlaceHolderMain$TextBoxPass'] = requiredFields.password;
	obj['ctl00$PlaceHolderMain$ImageButtonConnection.x'] = Math.floor((Math.random() * 10) + 1);
	obj['ctl00$PlaceHolderMain$ImageButtonConnection.y'] = Math.floor((Math.random() * 10) + 1);

	data.inputs = obj;

    //connector.logger.info('inputs', data.inputs);
    return next();
  });
};


// Procedure to login
function logIn(requiredFields, bills, data, next) {

  const options = {
    method: 'POST',
    url: 'https://espaceclient.aprr.fr/aprr/Pages/connexion.aspx',
    form: data.inputs,
	headers: {
        'Referer': 'https://espaceclient.aprr.fr/aprr/Pages/connexion.aspx',
     },
  };

  connector.logger.info('Logging in on APRR website...');

  request(options, (err, res, body) => {
    if (err) return next(err);

    connector.logger.info('Successfully logged in.');

    return next();
  });
};

function fetchBillingInfo(requiredFields, bills, data, next) {
  const url = 'https://espaceclient.aprr.fr/aprr/Pages/MaConsommation/conso_factures.aspx';

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
};

function parsePage(requiredFields, bills, data, next) {
  bills.fetched = [];
  moment.locale('fr');
  const $ = cheerio.load(data.html);
  var billFoundNumber = 0;

	$('table[class=tbl_factures] tr').each(function (i, tr) {
		var $tds = $(this).find('td'),
			billReference = $tds.eq(0).text().trim(),
			billDate = $tds.eq(1).text().trim(),
			billAmount = $tds.eq(2).text().trim(),
			billUrl = $tds.eq(3).html();

		if (billUrl && billReference && billDate && billAmount) {
			try {
				billAmount = parseFloat(((billAmount.match(/(\d+,\d+)/))[0]).replace(',', '.'));

				var month = parseInt((billUrl.trim().match(/processus=facture_(\d+)_\d+/))[1])-1;
				billDate = billDate.split(' ');

				var bill = {
				  date: moment([billDate[1], month, 28]),
				  type: 'Peage',
				  amount: billAmount,
				  pdfurl: 'https://espaceclient.aprr.fr/aprr/Pages/MaConsommation/conso_factures.aspx?facture=' + billReference,
				  vendor: 'APRR'
				};

				// saving bill
				bills.fetched.push(bill);
				billFoundNumber++;

			}
			catch (e) {
				console.log(e);
			}



		}
	});

  connector.logger.info('Successfully parsed the page, bills found:', billFoundNumber);
  next();
};

function customFilterExisting(requiredFields, bills, data, next) {
  filterExisting(log, Bill)(requiredFields, bills, data, next);
};

function customSaveDataAndFile(requiredFields, bills, data, next) {
  const fnsave = saveDataAndFile(log, Bill, fileOptions, ['peage', 'facture']);
  fnsave(requiredFields, bills, data, next);
};

function buildNotifContent(requiredFields, bills, data, next) {
  if (bills.filtered.length > 0) {
    const localizationKey = 'notification-konnectors-aprr';
    const options = {
      smart_count: bills.filtered.length,
    };
    bills.notifContent = localization.t(localizationKey, options);
  }

  next();
};
