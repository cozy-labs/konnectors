'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var async = require('async');
var cheerio = require('cheerio');
var moment = require('moment-timezone');
var request = require('request');
var url = require('url');

var baseKonnector = require('../lib/base_konnector');
var filterExisting = require('../lib/filter_existing');
var localization = require('../lib/localization_manager');
var saveDataAndFile = require('../lib/save_data_and_file');

var Bill = require('../models/bill');
var Event = require('../models/event');

var name = 'Voyages SNCF';

var logger = require('printit')({
  prefix: name,
  date: true
});

var fileOptions = {
  vendor: name,
  dateFormat: 'YYYYMMDD'
};

var userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + 'Gecko/20100101 Firefox/36.0';

var momentZone = 'Europe/Paris';

var connector = module.exports = baseKonnector.createNew({
  name: name,
  vendorLink: 'https://voyages-sncf.com',
  category: 'transport',
  color: {
    hex: '#0088CE',
    css: '#0088CE'
  },
  fields: {
    login: {
      type: 'text'
    },
    password: {
      type: 'password'
    },
    calendar: {
      type: 'text',
      advanced: true
    }
  },

  dataType: ['bill', 'travelDate'],

  models: [Event, Bill],

  fetchOperations: [logIn, getOrderPage, parseOrderPage, customFilterExisting, customSaveDataAndFile, saveEvents, buildNotifContent]

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
    if (err) {
      connector.logger.info(err);
      return next('bad credentials');
    }

    var jsonRes = JSON.parse(body);
    if (jsonRes.error) {
      connector.logger.info(jsonRes.error.code + ': ' + jsonRes.error.libelle);
      return next('bad credentials');
    }

    // We fetch bills and events
    entries.bills = {
      fetched: []
    };
    entries.events = [];

    return next();
  });
}

function getOrderPage(requiredFields, entries, data, next) {
  var url = 'https://espace-client.voyages-sncf.com/espaceclient/ordersconsultation/showOrdersForAjaxRequest?pastOrder=false&pageToLoad=1';

  connector.logger.info('Download orders HTML page...');
  getPage(url, function (err, res, body) {
    if (err) {
      connector.logger.info(err);
      return next('request error');
    }

    data.html = body;
    connector.logger.info('Orders page downloaded.');
    return next();
  });
}

function parseOrderPage(requiredFields, entries, data, next) {
  var $ = cheerio.load(data.html);
  var eventsToFetch = [];

  // Parse the orders page
  var $rows = $('.commande');
  $rows.each(function eachRow() {
    var $row = $(this);

    var orderInformations = parseOrderRow($, $row);

    var bill = {
      date: moment(orderInformations.date, 'DD/MM/YY'),
      amount: orderInformations.amount,
      vendor: 'VOYAGES SNCF',
      type: 'transport',
      content: orderInformations.label + ' - ' + orderInformations.reference
    };

    entries.bills.fetched.push(bill);

    if (orderInformations.isTravel === true) {
      eventsToFetch.push(orderInformations);
    }
  });

  // Fetch the detail of each order (for events)
  async.eachSeries(eventsToFetch, function (orderInformations, cb) {
    getEvents(orderInformations, entries.events, cb);
  }, next);
}

function parseOrderRow($, $row) {
  var reference = $row.find('.commande__detail div:nth-child(1) .texte--important').eq(0).text().trim();
  var label = $row.find('.commande__haut .texte--insecable').map(function mapRow() {
    return $(this).text().trim();
  }).get().join('/');
  var date = $row.find('.commande__detail div:nth-child(2) .texte--important').eq(0).text().trim();
  var amount = $row.find('.commande__detail div:nth-child(3) .texte--important').eq(0).text().trim().replace(' €', '');

  var $link = $row.find('.commande__bas a');
  // Boolean, the order is not always a travel (could be a discount card...)
  var isTravel = $link.text().trim().indexOf('voyage') !== -1;
  var link = $link.attr('href');

  // Parse query string to get the owner name
  var owner = url.parse(link, true).query.ownerName;

  return {
    reference: reference,
    label: label,
    date: date,
    amount: amount,
    isTravel: isTravel,
    owner: owner
  };
}

function getEvents(orderInformations, events, callback) {
  // Try to get the detail order
  var uri = 'http://monvoyage.voyages-sncf.com/vsa/api/order/fr_FR/' + orderInformations.owner + '/' + orderInformations.reference;
  getPage(uri, function (err, res, body) {
    if (err) {
      connector.logger.info(err);
      return callback('request error');
    }

    var result = JSON.parse(body);
    // This order is in the old html page format
    if (result.order === null) {
      return getEventsOld(orderInformations, events, callback);
    }

    var folders = result.order.folders;
    // If folder is an object, convert it into an array
    if (folders && !Array.isArray(folders)) {
      folders = Object.keys(folders).map(function (ref) {
        return folders[ref];
      });
    }
    folders.forEach(function (folder) {
      // Create our passengers (id associated to their name)
      var passengers = {};
      folder.passengers.forEach(function (passenger) {
        passengers[passenger.passengerId] = passenger.displayName;
      });

      // Parse each travel
      folder.travels.forEach(function (travel) {
        var travelType = void 0;
        if (travel.type === 'OUTWARD') {
          travelType = localization.t('konnector voyages_sncf outward');
        } else {
          travelType = localization.t('konnector voyages_sncf inward');
        }

        // Each travel can be composed of several segments
        travel.segments.forEach(function (segment) {
          var departureDate = segment.departureDate;
          var arrivalDate = segment.arrivalDate;

          var departureStation = segment.origin.stationName;
          var arrivalStation = segment.destination.stationName;

          var departureCity = segment.origin.cityName;
          var arrivalCity = segment.destination.cityName;

          var trainType = segment.transport.label;
          var trainNumber = segment.trainNumber;
          var trainClass = segment.comfortClass;

          var segmentPassengers = {};

          // More informations for each passenger (placement...)
          var placements = segment.placements;
          Object.keys(placements).forEach(function (passengerId) {
            var placement = placements[passengerId];
            segmentPassengers[passengerId] = {
              placement: {
                car: placement.coachNumber,
                seat: placement.seatNumber
              }
            };
          });

          var fares = segment.fares;
          Object.keys(fares).forEach(function (passengerId) {
            var fare = fares[passengerId];

            // Maybe there is no placement for this segment (TER...)
            if (!segmentPassengers[passengerId]) {
              segmentPassengers[passengerId] = {};
            }

            segmentPassengers[passengerId].fare = fare.name;
          });

          var description = travelType + ': ' + departureCity + '/' + arrivalCity;

          var details = departureStation + ' -> ' + arrivalStation + '\n';
          details += localization.t('konnector voyages_sncf reference');
          details += ': ' + orderInformations.reference + '\n';
          details += trainType + ' ' + trainNumber + '\n';
          details += localization.t('konnector voyages_sncf class');
          details += ': ' + trainClass + '\n\n';

          Object.keys(segmentPassengers).forEach(function (passengerId) {
            var passengerName = passengers[passengerId];
            var segmentPassenger = segmentPassengers[passengerId];

            if (segmentPassenger) {
              var passengerPlace = '';
              if (segmentPassenger.placement !== undefined) {
                passengerPlace = localization.t('konnector voyages_sncf car');
                passengerPlace += ' ' + segmentPassenger.placement.car + ' ';
                passengerPlace += localization.t('konnector voyages_sncf place');
                passengerPlace += ' ' + segmentPassenger.placement.seat;
              }

              var passengerFare = '';
              if (segmentPassenger.fare !== undefined) {
                if (passengerPlace !== '') {
                  passengerFare = ' -';
                }

                passengerFare += ' ' + segmentPassenger.fare;
              }

              details += passengerName + ': ' + passengerPlace + passengerFare;
            }
          });

          var event = {
            description: description,
            details: details,
            id: departureDate + trainType + trainNumber,
            start: moment.tz(departureDate, moment.ISO_8601, momentZone).toISOString(),
            end: moment.tz(arrivalDate, moment.ISO_8601, momentZone).toISOString(),
            place: departureStation
          };

          events.push(event);
        });
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
    var localizationKey = 'notification bills';
    var options = {
      smart_count: entries.bills.filtered.length
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  if (entries.events.nbCreations > 0) {
    var _localizationKey = 'notification events created';
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
    var _localizationKey2 = 'notification events updated';
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

// ----------------------------------------------------------------------------
// Functions to parse old SNCF pages

// SNCF did not change the html pages for old orders, only for new ones
function getEventsOld(orderInformations, events, callback) {
  var uri = 'http://espace-client.voyages-sncf.com/services-train/suivi-commande?pnrRef=' + orderInformations.reference + '&ownerName=' + orderInformations.owner + '&fromCustomerAccount=true';

  // Try to get the detail order
  getPage(uri, function (err, res, body) {
    if (err) {
      connector.logger.info(err);
      return callback('request error');
    }

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
        details += localization.t('konnector voyages_sncf reference');
        details += ': ' + reference + '\n';
        details += localization.t('konnector voyages_sncf ticket choice');
        details += ': ' + ticketChoice + '\n';
        details += trainType + ' ' + trainNumber + ' - ' + trainInfo + '\n\n';

        // Add more informations for this travel for each passenger
        Object.keys(moreInfos).forEach(function (passenger) {
          var moreInfo = moreInfos[passenger].shift();
          // Sometimes we don't have "more informations" for all travels
          if (moreInfo) {
            details += passenger + ': ' + moreInfo.fare + ' - ' + moreInfo.place_details;
          }
        });

        var momentFormat = 'DD MMMM YYYY HH mm';
        // SNCF is in the french timezone
        var momentZone = 'Europe/Paris';

        var event = {
          description: description,
          details: details,
          id: date + trainType + trainNumber,
          start: moment.tz(date + ' ' + beginHour, momentFormat, momentZone).toISOString(),
          end: moment.tz(date + ' ' + arrivalHour, momentFormat, momentZone).toISOString(),
          place: beginStation
        };

        events.push(event);
      });
    });

    return callback();
  });
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