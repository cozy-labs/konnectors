/* global emit */

var cozydb = require('cozydb');
var request = require('request').defaults({
    jar: true
});
var moment = require('moment');
var cheerio = require('cheerio');

var fetcher = require('../lib/fetcher');
var filterExisting = require('../lib/filter_existing');
var saveDataAndFile = require('../lib/save_data_and_file');
var localization = require('../lib/localization_manager');
var linkBankOperation = require('../lib/link_bank_operation');

var log = require('printit')({
    prefix: "Sfr",
    date: true
});


var PhoneBill = cozydb.getModel( 'PhoneBill', {
    date: Date,
    vendor: String,
    amount: Number,
    fileId: String,
    binaryId: String,
    pdfurl: String
});

PhoneBill.all = (callback) => {
    PhoneBill.request('byDate', callback);
};

// Konnector

module.exports = {
    name: "Sfrbox",
    slug: "sfrbox",
    description: 'konnector description sfr',
    vendorLink: "https://www.sfr.fr/",

    fields: {
        login: "text",
        password: "password",
        folderPath: "folder"
    },
    models: {
        phonebill: PhoneBill
    },

    // Define model requests.
    init: (callback) => {
        PhoneBill.defineRequest('byDate', (doc) => {emit(doc.date, doc);}, (err) => {
            callback(err);
        });
    },
    fetch: (requiredFields, callback) => {
        log.info("Import started");
        fetcher.new()
            .use(getToken)
            .use(logIn)
            .use(fetchBillingInfo)
            .use(parsePage)
            .use(filterExisting(log, PhoneBill))
            .use(saveDataAndFile(log, PhoneBill, 'sfr', ['facture']))
            .use(linkBankOperation, {
                log: log,
                model: PhoneBill,
                identifier: 'SFR',
                minDateDelta: 4,
                maxDateDelta: 20,
                amountDelta: 0.1
            })
            .args(requiredFields, {}, {})
            .fetch((err, fields, entries) => {
                if (err) return callback(err);

                log.info("Import finished");

                // TODO move this in a procedure.
                var notifContent = null;
                if (entries && entries.filtered && entries.filtered.length > 0) {
                    var localizationKey = 'notification sfr';
                    var options = {smart_count: entries.filtered.length};
                    notifContent = localization.t(localizationKey, options);
                }

                callback(null, notifContent);
            });
    }
};

// Procedure to get the login token
function getToken(requiredFields, bills, data, next) {
    var url = "https://www.sfr.fr/bounce?target=//www.sfr.fr/sfr-et-moi/bounce.html&casforcetheme=mire-sfr-et-moi&mire_layer";
    var options = {
        url: url,
        method: 'GET'
    };

    log.info('Getting the token on Sfr Website...');

    request(options, function(err, res, body) {
        if (err) return next(err);

        var $ = cheerio.load(body);
        data.token = $("input[name=lt]").val();

        log.info("Token retrieved : " + data.token);
        next();
    });
}

// Procedure to login to Sfr website.
function logIn(requiredFields, bills, data, next) {
    var options = {
        method: 'POST',
        url: "https://www.sfr.fr/cas/login?domain=mire-sfr-et-moi&service=https://www.sfr.fr/accueil/j_spring_cas_security_check#sfrclicid=EC_mire_Me-Connecter",
        form: {
            lt: data.token,
            execution: "e1s1",
            _eventId: "submit",
            username: requiredFields.login,
            password: requiredFields.password,
            identifier: ""
        }
    };

    log.info('Logging in on Sfr website...');

    request(options, (err) => {
        if (err) return next(err);

        log.info('Successfully logged in.');
        next();
    });
}

function fetchBillingInfo(requiredFields, bills, data, next) {
    var url = "https://espace-client.sfr.fr/facture-fixe/consultation";

    log.info('Fetch bill info');
    var options = {
        method: 'GET',
        url: url
    };
    request(options, function(err, res, body) {
        if (err) {
            log.error('An error occured while fetching bills');
            log.raw(err);
            return next(err);
        }
        log.info('Fetch bill info succeeded');

        data.html = body;
        next();
    });
}

function parsePage(requiredFields, bills, data, next) {
    bills.fetched = [];
    moment.locale('fr');
    var $ = cheerio.load(data.html);

    $('#tab tr').each(function() {
        var date = $(this).find(".date").text();
        date = date.split(" ");
        date.pop();
        date = date.join(" ");
        date = moment(date, "D MMM YYYY");
        var prix = $(this).find(".prix").text().replace("€", "").replace(",", ".");
        prix = parseFloat(prix);
        var pdf = $(this).find(".liens a").attr("href");
        pdf = "https://espace-client.sfr.fr" + pdf;
        log.info("Pdf url : " + pdf);

        var bill = {
            date: date,
            amount: prix,
            pdfurl: pdf,
            vendor: 'Sfr'
        };
        bills.fetched.push(bill);
    });
    log.info('Successfully parsed the page');
    next();
}
