'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var async = require('async');
var cheerio = require('cheerio');
var moment = require('moment');
var request = require('request');

var baseKonnector = require('../lib/base_konnector');
var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');

var Bill = require('../models/bill');
var Event = require('../models/event');

var name = 'SNCF';

var logger = require('printit')({
  prefix: name,
  date: true
});

var fileOptions = {
  vendor: name,
  dateFormat: 'YYYYMMDD'
};

var userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + 'Gecko/20100101 Firefox/36.0';

var connector = module.exports = baseKonnector.createNew({
  name: name,

  fields: {
    login: 'text',
    password: 'password',
    calendar: 'text'
  },

  models: [Event, Bill],

  fetchOperations: [logIn, getOrderHistoryPage, parseOrderHistoryPage, getOrderPage, parseOrderPage, customFilterExisting, customSaveDataAndFile, saveEvents, buildNotifContent]

});

function logIn(requiredFields, entries, data, next) {
  var postUrl = 'https://espace-client.voyages-sncf.com/espaceclient/authentication/flowSignIn';

  // Directly post credentials
  connector.logger.info('Logging in in SNCF.');
  var loginOptions = {
    uri: postUrl,
    jar: true,
    method: 'POST',
    form: {
      login: requiredFields.login,
      password: requiredFields.password
    },
    headers: {
      'User-Agent': userAgent
    }
  };

  request(loginOptions, function (err, res, body) {
    if (err) return next(err);

    var jsonRes = JSON.parse(body);
    if (jsonRes.error) {
      return next(new Error(jsonRes.error.code + ': ' + jsonRes.error.libelle));
    }

    // We fetch bills and events
    entries.bills = {
      fetched: []
    };
    entries.events = [];

    return next();
  });
}

function getOrderHistoryPage(requiredFields, entries, data, next) {
  var url = 'https://espace-client.voyages-sncf.com/espaceclient/ordersconsultation/showOrdersForAjaxRequest?pastOrder=true&onlyUsedOrder=false&pageToLoad=1';

  connector.logger.info('Download orders history HTML page...');
  getPage(url, function (err, res, body) {
    if (err) return next(err);

    data.html = body;
    connector.logger.info('Orders history page downloaded.');
    return next();
  });
}

function parseOrderHistoryPage(requiredFields, entries, data, next) {
  var $ = cheerio.load(data.html);

  // Parse the orders page
  var $rows = $('table tbody tr:not(:last-child)');
  var table = parseSNCFTable($, $rows);
  var informations = table.informations;
  informations.forEach(function (information) {
    var bill = {
      date: moment(information.orderDate, 'DD/MM/YYYY'),
      amount: information.amount,
      vendor: 'SNCF',
      type: 'transport',
      content: information.labelOrder + ' - ' + information.dates
    };

    entries.bills.fetched.push(bill);
  });

  next();
}

function getOrderPage(requiredFields, entries, data, next) {
  var url = 'https://espace-client.voyages-sncf.com/espaceclient/ordersconsultation/showOrdersForAjaxRequest?pastOrder=false&pageToLoad=1';

  connector.logger.info('Download orders HTML page...');
  getPage(url, function (err, res, body) {
    if (err) return next(err);

    data.html = body;
    connector.logger.info('Orders page downloaded.');
    return next();
  });
}

function parseOrderPage(requiredFields, entries, data, next) {
  var $ = cheerio.load(data.html);

  // Parse the orders page
  var $rows = $('table tbody tr:not(:last-child)');
  var table = parseSNCFTable($, $rows);
  var informations = table.informations;
  var detailPages = table.detailPages;

  // console.log(informations);
  // console.log(detailPages);
  informations.forEach(function (information) {
    var bill = {
      date: moment(information.orderDate, 'DD/MM/YYYY'),
      amount: information.amount,
      vendor: 'SNCF',
      type: 'transport',
      content: information.labelOrder + ' - ' + information.dates
    };

    entries.bills.fetched.push(bill);
  });

  // Fetch the detail of each order (for events)
  async.eachSeries(Object.keys(detailPages), function (date, cb) {
    connector.logger.info('Fetching order(s) of ' + date + '.');
    getEvents(detailPages[date], entries.events, cb);
  }, next);
}

function getEvents(uri, events, callback) {
  // Try to get the detail order
  getPage(uri, function (err, res, body) {
    if (err) return callback(err);

    var $ = cheerio.load(body);
    var $subOrders = $('.submit.button-primary.btn');
    // Stop it.
    // This is a page composed of many orders.
    // Recursively fetch them individually.
    if ($subOrders.length !== 0) {
      var _ret = function () {
        var subOrdersUris = [];
        $subOrders.each(function forEachSubOrders() {
          var $subOrder = $(this);
          subOrdersUris.push($subOrder.attr('href'));
        });

        return {
          v: async.eachSeries(subOrdersUris, function (subOrderUri, cb) {
            getEvents(subOrderUri, events, cb);
          }, callback)
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    // We'll parse french dates
    moment.locale('fr');

    // Franglish stuffs
    var $orderHeader = $('.entete-commande');
    // "Title"
    var $roundTrip = $orderHeader.find('span');
    var $ticketDetail = $orderHeader.parent().find('.retrait-billet-detail');
    var $travels = $ticketDetail.find('.outward, .inward');
    // Reference...
    var $folder = $('.folder-box');

    var reference = $folder.find('.reference-dossier span').text();
    var ticketChoice = $folder.parent().find('.types-retrait .chosen-mode-name').text();
    var label = $roundTrip.eq(0).text().trim() + '/' + $roundTrip.eq(1).text().trim();

    $travels.each(function forEachTravels() {
      var $travel = $(this);
      var $date = $travel.find('.date-trajet');
      var $moreInfos = $travel.find('.travel_more_infos_table');

      var moreInfos = parseMoreInfos($, $moreInfos);
      var date = $date.find('p').eq(1).text().trim();
      var travelType = $date.find('.label').text().trim();

      // When we have correpondances for example
      var $travelSegments = $travel.find('.travel');
      $travelSegments.each(function forEachTravelSegments() {
        var $travelSegment = $(this);
        var $departure = $travelSegment.find('.departure');
        var $arrival = $travelSegment.find('.arrival');

        // Yup, the generated HTML is just a joke.
        var beginHour = $departure.find('.hour p').eq(1).text().trim();
        var beginStation = $departure.find('.station p').eq(1).text().trim();
        var trainType = $departure.find('.train_picto').text().replace('Transporteur :', '').trim();
        var trainNumber = $departure.find('.train_number p').eq(1).text().trim();
        var trainInfo = $departure.find('.train_infos .train_class p').eq(1).text().trim();

        var arrivalHour = $arrival.find('.hour p').eq(1).text().trim();
        var arrivalStation = $arrival.find('.station p').eq(1).text().trim();

        var description = travelType + ': ' + label;

        var details = beginStation + ' -> ' + arrivalStation + '\n';
        details += localization.t('konnector sncf reference');
        details += ': ' + reference + '\n';
        details += localization.t('konnector sncf ticket choice');
        details += ': ' + ticketChoice + '\n';
        details += trainType + ' ' + trainNumber + ' - ' + trainInfo + '\n\n';

        // Add more informations for this travel for each passenger
        Object.keys(moreInfos).forEach(function (passenger) {
          var moreInfo = moreInfos[passenger].shift();
          // Sometimes we don't have "more informations" for all travels
          if (moreInfo) {
            details += passenger + ': ' + moreInfo.fare + ' - ' + moreInfo.placeDetails;
          }
        });

        var momentFormat = 'DD MMMM YYYY HH mm';
        var event = {
          description: description,
          details: details,
          id: date + trainType + trainNumber,
          start: moment(date + ' ' + beginHour, momentFormat),
          end: moment(date + ' ' + arrivalHour, momentFormat),
          place: beginStation
        };
        events.push(event);
      });
    });

    return callback();
  });
}

function customFilterExisting(requiredFields, entries, data, next) {
  filterExisting(logger, Bill)(requiredFields, entries.bills, data, next);
}

function customSaveDataAndFile(requiredFields, entries, data, next) {
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(requiredFields, entries.bills, data, next);
}

function saveEvents(requiredFields, entries, data, next) {
  entries.events.nbCreations = 0;
  entries.events.nbUpdates = 0;

  async.eachSeries(entries.events, function (event, cb) {
    event.tags = [requiredFields.calendar];

    Event.createOrUpdate(event, function (err, cozyEvent, changes) {
      if (err) {
        connector.logger.error(err);
        connector.logger.error('Event cannot be saved.');
      } else {
        if (changes.creation) entries.events.nbCreations++;
        if (changes.update) entries.events.nbUpdates++;
      }

      cb();
    });
  }, next);
}

function buildNotifContent(requiredFields, entries, data, next) {
  if (entries.bills.filtered.length > 0) {
    var localizationKey = 'notification sncf bills';
    var options = {
      smart_count: entries.bills.filtered.length
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  if (entries.events.nbCreations > 0) {
    var _localizationKey = 'notification sncf events creation';
    var _options = {
      smart_count: entries.events.nbCreations
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(_localizationKey, _options);
    } else {
      entries.notifContent += ' ' + localization.t(_localizationKey, _options);
    }
  }

  if (entries.nbUpdates > 0) {
    var _localizationKey2 = 'notification sncf events update';
    var _options2 = {
      smart_count: entries.events.nbUpdates
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(_localizationKey2, _options2);
    } else {
      entries.notifContent += ' ' + localization.t(_localizationKey2, _options2);
    }
  }

  next();
}

function getPage(url, callback) {
  var options = {
    method: 'GET',
    uri: url,
    jar: true,
    headers: {
      'User-Agent': userAgent
    }
  };

  return request(options, callback);
}

function parseSNCFTable($, $rows) {
  var dataIndices = {
    refOrder: 0,
    labelOrder: 1,
    dates: 2,
    price: 3,
    orderDate: 5,
    detailPage: 6
  };
  var informations = [];
  var detailPages = {};

  // Parse the orders page
  $rows.each(function forEachRows() {
    var $cells = $(this).find('td');

    var refOrder = $cells.eq(dataIndices.refOrder).find('p').text().trim();
    var labelOrder = $cells.eq(dataIndices.labelOrder).find('p').text().trim();
    var price = $cells.eq(dataIndices.price).find('div').text().trim();
    var orderDate = $cells.eq(dataIndices.orderDate).find('div').text().trim();
    var detailPage = $cells.eq(dataIndices.detailPage).find('a').attr('href');

    var $dates = $cells.eq(dataIndices.dates).find('p');
    var dates = $dates.eq(0).text().trim();
    if ($dates.length > 1) {
      dates += ' - ' + $dates.eq(1).text().trim();
    }

    // price === '' ---> canceled travel
    // So we don't add it to the bills
    if (price !== '') {
      informations.push({
        refOrder: refOrder,
        labelOrder: labelOrder,
        dates: dates,
        orderDate: moment(orderDate, 'DD/MM/YYYY'),
        amount: price.replace('€', ''),
        vendor: 'SNCF',
        type: 'transport'
      });

      detailPages[orderDate] = detailPage;
    }
  });

  return {
    informations: informations,
    detailPages: detailPages
  };
}

function parseMoreInfos($, $moreInfos) {
  var moreInfos = {};
  var $rows = $moreInfos.find('tr');
  var passenger = null;

  $rows.each(function forEachRows() {
    var $row = $(this);

    // Changed passenger ?
    var $passengerLabel = $row.find('.passenger_label');
    if ($passengerLabel.length !== 0) {
      passenger = $passengerLabel.text().trim();
      moreInfos[passenger] = [];
    }

    // Get the infos
    var fare = $row.find('.fare_details .fare-name').text().replace(':', '').trim();

    // Place detail or "no reservation"
    var placeDetails = null;
    var $carPlace = $row.find('.place_details .car_place');
    if ($carPlace.length !== 0) {
      placeDetails = $carPlace.text().trim().replace(/\n/, ' ');
    } else {
      placeDetails = $row.find('.placement').text().trim();
    }

    // We push the new travel segment to this passenger
    moreInfos[passenger].push({
      fare: fare,
      place_details: placeDetails
    });
  });

  return moreInfos;
}