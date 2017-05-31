// Generated by CoffeeScript 1.11.1
var Bill, File, async, baseKonnector, buildNotification, checkLogin, cheerio, cozydb, customLinkBankOperation, fileOptions, filterExisting, fs, getPdf, linkBankOperation, localization, log, logIn, moment, parsePage, request, saveDataAndFile;

cozydb = require('cozydb');

request = require('request');

moment = require('moment');

cheerio = require('cheerio');

fs = require('fs');

async = require('async');

File = require('../models/file');

Bill = require('../models/bill');

baseKonnector = require('../lib/base_konnector');

filterExisting = require('../lib/filter_existing');

saveDataAndFile = require('../lib/save_data_and_file');

linkBankOperation = require('../lib/link_bank_operation');

localization = require('../lib/localization_manager');

log = require('printit')({
  prefix: "Ameli",
  date: true
});

checkLogin = function(requiredFields, billInfos, data, next) {
  if (requiredFields.login.length > 13) {
    log.error("Login with " + requiredFields.login.length + " digits : refused");
    return next('bad credentials');
  } else {
    return next();
  }
};

logIn = function(requiredFields, billInfos, data, next) {
  var form, loginUrl, options, refererUrl, reimbursementUrl, submitUrl;
  loginUrl = "https://assure.ameli.fr/PortailAS/appmanager/PortailAS/" + "assure?_somtc=true";
  submitUrl = "https://assure.ameli.fr/PortailAS/appmanager/PortailAS/" + "assure?_nfpb=true&_windowLabel=connexioncompte_2&connexioncompte_2_" + "actionOverride=/portlets/connexioncompte/validationconnexioncompte&" + "_pageLabel=as_login_page";
  reimbursementUrl = "https://assure.ameli.fr/PortailAS/appmanager/" + "PortailAS/assure?_nfpb=true&_pageLabel=as_paiements_page";
  refererUrl = "https://assure.ameli.fr/PortailAS/appmanager/" + "PortailAS/assure?_nfpb=true&_pageLabel=as_login_page";
  form = {
    "connexioncompte_2numSecuriteSociale": requiredFields.login,
    "connexioncompte_2codeConfidentiel": requiredFields.password,
    "connexioncompte_2actionEvt": "connecter",
    "submit": "Valider"
  };
  options = {
    method: 'GET',
    jar: true,
    strictSSL: false,
    url: loginUrl
  };
  return request(options, function(err, res, body) {
    var loginOptions;
    if (err) {
      log.error(err);
      return next('request error');
    } else {
      loginOptions = {
        method: 'POST',
        form: form,
        jar: true,
        strictSSL: false,
        url: submitUrl,
        headers: {
          'Cookie': res.headers['set-cookie'],
          'Referer': refererUrl
        }
      };
      return request(loginOptions, function(err, res, body) {
        var $, reimbursementOptions;
        $ = cheerio.load(body);
        if (err) {
          log.error(err);
          return next('bad credentials');
        } else if ($("#id_lien_deco").length !== 1) {
          log.error('Authentication error');
          return next('bad credentials');
        } else {
          reimbursementOptions = {
            method: 'GET',
            jar: true,
            strictSSL: false,
            headers: {
              'Cookie': res.headers['set-cookie'],
              'Referer': refererUrl
            },
            url: reimbursementUrl
          };
          return request(reimbursementOptions, function(err, res, body) {
            if (err) {
              log.error(err);
              return next('request error');
            } else {
              data.html = body;
              return next();
            }
          });
        }
      });
    }
  });
};

parsePage = function(requiredFields, healthBills, data, next) {
  var $, baseUrl, billOptions, billUrl, endDate, startDate;
  healthBills.fetched = [];
  if (data.html == null) {
    return next();
  }
  $ = cheerio.load(data.html);
  startDate = $('#paiements_1dateDebut').attr('value');
  endDate = $('#paiements_1dateFin').attr('value');
  baseUrl = "https://assure.ameli.fr/PortailAS/paiements.do?actionEvt=";
  billUrl = baseUrl + "afficherPaiementsComplementaires&DateDebut=";
  billUrl += startDate + "&DateFin=" + endDate;
  billUrl += "&Beneficiaire=tout_selectionner&afficherReleves=false&" + "afficherIJ=false&afficherInva=false&afficherRentes=false&afficherRS=" + "false&indexPaiement=&idNotif=";
  billOptions = {
    jar: true,
    strictSSL: false,
    url: billUrl
  };
  return request(billOptions, function(err, res, body) {
    var i;
    if (err) {
      log.error(err);
      return next('request error');
    } else {
      $ = cheerio.load(body);
      i = 0;
      $('.blocParMois').each(function() {
        var year;
        year = $($(this).find('.rowdate .mois').get(0)).text();
        year = year.split(' ')[1];
        return $('[id^=lignePaiement' + i++ + ']').each(function() {
          var amount, attrInfos, bill, date, day, detailsUrl, idPaiement, indexGroupe, indexPaiement, label, lineId, month, naturePaiement, tokens;
          amount = $($(this).find('.col-montant').get(0)).text();
          amount = amount.replace(' €', '').replace(',', '.');
          amount = parseFloat(amount);
          month = $($(this).find('.col-date .mois').get(0)).text();
          day = $($(this).find('.col-date .jour').get(0)).text();
          date = day + " " + month + " " + year;
          moment.locale('fr');
          date = moment(date, 'Do MMMM YYYY');
          label = $($(this).find('.col-label').get(0)).text();
          attrInfos = $(this).attr('onclick');
          tokens = attrInfos.split("'");
          idPaiement = tokens[1];
          naturePaiement = tokens[3];
          indexGroupe = tokens[5];
          indexPaiement = tokens[7];
          detailsUrl = baseUrl + "chargerDetailPaiements&";
          detailsUrl += "idPaiement=" + idPaiement + "&";
          detailsUrl += "naturePaiement=" + naturePaiement + "&";
          detailsUrl += "indexGroupe=" + indexGroupe + "&";
          detailsUrl += "indexPaiement=" + indexPaiement;
          lineId = indexGroupe + indexPaiement;
          bill = {
            amount: amount,
            type: 'health',
            subtype: label,
            date: date,
            vendor: 'Ameli',
            lineId: lineId,
            detailsUrl: detailsUrl
          };
          if (bill.amount != null) {
            return healthBills.fetched.push(bill);
          }
        });
      });
      return async.each(healthBills.fetched, getPdf, function(err) {
        return next(err);
      });
    }
  });
};

getPdf = function(bill, callback) {
  var detailsOptions;
  detailsOptions = {
    jar: true,
    strictSSL: false,
    url: bill.detailsUrl
  };
  return request(detailsOptions, function(err, res, body) {
    var $, pdfUrl;
    if (err) {
      log.error(err);
      return callback('request error');
    } else {
      $ = cheerio.load(body);
      pdfUrl = $('[id=liendowndecompte' + bill.lineId + ']').attr('href');
      if (pdfUrl) {
        pdfUrl = "https://assure.ameli.fr" + pdfUrl;
        bill.pdfurl = pdfUrl;
        return callback(null);
      }
    }
  });
};

buildNotification = function(requiredFields, healthBills, data, next) {
  var localizationKey, notifContent, options, ref;
  log.info("Import finished");
  notifContent = null;
  if ((healthBills != null ? (ref = healthBills.filtered) != null ? ref.length : void 0 : void 0) > 0) {
    localizationKey = 'notification ameli';
    options = {
      smart_count: healthBills.filtered.length
    };
    healthBills.notifContent = localization.t(localizationKey, options);
  }
  return next();
};

customLinkBankOperation = function(requiredFields, healthBills, data, next) {
  var bankIdentifier, identifier;
  identifier = 'C.P.A.M.';
  bankIdentifier = requiredFields.bank_identifier;
  if ((bankIdentifier != null) && bankIdentifier !== "") {
    identifier = bankIdentifier;
  }
  return linkBankOperation({
    log: log,
    model: Bill,
    identifier: identifier,
    dateDelta: 10,
    amountDelta: 0.1
  })(requiredFields, healthBills, data, next);
};

fileOptions = {
  vendor: 'ameli',
  dateFormat: 'YYYYMMDD'
};

module.exports = baseKonnector.createNew({
  name: "Ameli",
  vendorLink: "http://www.ameli.fr/",
  category: 'health',
  color: {
    hex: '#0062AE',
    css: '#0062AE'
  },
  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    bank_identifier: {
      type: 'text'
    },
    folderPath: {
      type: 'folder',
      advanced: true
    }
  },
  dataType: ['refund'],
  models: [Bill],
  fetchOperations: [checkLogin, logIn, parsePage, filterExisting(log, Bill), saveDataAndFile(log, Bill, fileOptions, ['health', 'bill']), customLinkBankOperation, buildNotification]
});
