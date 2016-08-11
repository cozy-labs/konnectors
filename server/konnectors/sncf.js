'use strict';

const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const request = require('request');
const url = require('url');

const baseKonnector = require('../lib/base_konnector');
const filterExisting = require('../lib/filter_existing');
const localization = require('../lib/localization_manager');
const saveDataAndFile = require('../lib/save_data_and_file');

const Bill = require('../models/bill');
const Event = require('../models/event');


const name = 'SNCF';

const logger = require('printit')({
  prefix: name,
  date: true,
});

const fileOptions = {
  vendor: name,
  dateFormat: 'YYYYMMDD',
};

const userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' +
                  'Gecko/20100101 Firefox/36.0';

const momentZone = 'Europe/Paris';

const connector = module.exports = baseKonnector.createNew({
  name,

  fields: {
    login: 'text',
    password: 'password',
    calendar: 'text',
  },

  models: [Event, Bill],

  fetchOperations: [
    logIn,
    getOrderPage,
    parseOrderPage,
    customFilterExisting,
    customSaveDataAndFile,
    saveEvents,
    buildNotifContent,
  ],

});


function logIn(requiredFields, entries, data, next) {
  const postUrl = 'https://espace-client.voyages-sncf.com/espaceclient/authentication/flowSignIn';

  // Directly post credentials
  connector.logger.info('Logging in in SNCF.');
  const loginOptions = {
    uri: postUrl,
    jar: true,
    method: 'POST',
    form: {
      login: requiredFields.login,
      password: requiredFields.password,
    },
    headers: {
      'User-Agent': userAgent,
    },
  };

  request(loginOptions, (err, res, body) => {
    if (err) return next(err);

    const jsonRes = JSON.parse(body);
    if (jsonRes.error) {
      return next(new Error(`${jsonRes.error.code}: ${jsonRes.error.libelle}`));
    }

    // We fetch bills and events
    entries.bills = {
      fetched: [],
    };
    entries.events = [];

    return next();
  });
}

function getOrderPage(requiredFields, entries, data, next) {
  const url = 'https://espace-client.voyages-sncf.com/espaceclient/ordersconsultation/showOrdersForAjaxRequest?pastOrder=false&pageToLoad=1';

  connector.logger.info('Download orders HTML page...');
  getPage(url, (err, res, body) => {
    if (err) return next(err);

    data.html = body;
    connector.logger.info('Orders page downloaded.');
    return next();
  });
}


function parseOrderPage(requiredFields, entries, data, next) {
  const $ = cheerio.load(data.html);
  const eventsToFetch = [];

  // Parse the orders page
  const $rows = $('.commande');
  $rows.each(function eachRow() {
    const $row = $(this);

    const orderInformations = parseOrderRow($, $row);

    const bill = {
      date: moment(orderInformations.date, 'DD/MM/YY'),
      amount: orderInformations.amount,
      vendor: 'SNCF',
      type: 'transport',
      content: `${orderInformations.label} - ${orderInformations.reference}`,
    };

    entries.bills.fetched.push(bill);

    if (orderInformations.isTravel === true) {
      eventsToFetch.push(orderInformations);
    }
  });

  // Fetch the detail of each order (for events)
  async.eachSeries(eventsToFetch, (orderInformations, cb) => {
    getEvents(orderInformations, entries.events, cb);
  }, next);
}

function parseOrderRow($, $row) {
  const reference = $row.find('.commande__detail div:nth-child(1) .texte--important')
                        .eq(0)
                        .text()
                        .trim();
  const label = $row.find('.commande__haut .texte--insecable')
                    .map(function mapRow() {
                      return $(this).text().trim();
                    })
                    .get()
                    .join('/');
  const date = $row.find('.commande__detail div:nth-child(2) .texte--important')
                   .eq(0)
                   .text()
                   .trim();
  const amount = $row.find('.commande__detail div:nth-child(3) .texte--important')
                     .eq(0)
                     .text()
                     .trim()
                     .replace(' €', '');

  const $link = $row.find('.commande__bas a');
  // Boolean, the order is not always a travel (could be a discount card...)
  const isTravel = $link.text().trim().indexOf('voyage') !== -1;
  const link = $link.attr('href');

  // Parse query string to get the owner name
  const owner = url.parse(link, true).query.ownerName;

  return {
    reference,
    label,
    date,
    amount,
    isTravel,
    owner,
  };
}

function getEvents(orderInformations, events, callback) {
  // Try to get the detail order
  const uri = `http://monvoyage.voyages-sncf.com/vsa/api/order/fr_FR/${orderInformations.owner}/${orderInformations.reference}`;
  getPage(uri, (err, res, body) => {
    if (err) return callback(err);

    const result = JSON.parse(body);
    // This order is in the old html page format
    if (result.order === null) {
      return getEventsOld(orderInformations, events, callback);
    }

    const folders = result.order.folders;
    folders.forEach((folder) => {
      // Create our passengers (id associated to their name)
      const passengers = {};
      folder.passengers.forEach((passenger) => {
        passengers[passenger.passengerId] = passenger.displayName;
      });

      // Parse each travel
      folder.travels.forEach((travel) => {
        let travelType;
        if (travel.type === 'OUTWARD') {
          travelType = localization.t('konnector sncf outward');
        } else {
          travelType = localization.t('konnector sncf inward');
        }

        // Each travel can be composed of several segments
        travel.segments.forEach((segment) => {
          const departureDate = segment.departureDate;
          const arrivalDate = segment.arrivalDate;

          const departureStation = segment.origin.stationName;
          const arrivalStation = segment.destination.stationName;

          const departureCity = segment.origin.cityName;
          const arrivalCity = segment.destination.cityName;

          const trainType = segment.transport.label;
          const trainNumber = segment.trainNumber;
          const trainClass = segment.comfortClass;

          const segmentPassengers = {};

          // More informations for each passenger (placement...)
          const placements = segment.placements;
          Object.keys(placements).forEach((passengerId) => {
            const placement = placements[passengerId];
            segmentPassengers[passengerId] = {
              placement: {
                car: placement.coachNumber,
                seat: placement.seatNumber,
              },
            };
          });

          const fares = segment.fares;
          Object.keys(fares).forEach((passengerId) => {
            const fare = fares[passengerId];

            // Maybe there is no placement for this segment (TER...)
            if (!segmentPassengers[passengerId]) {
              segmentPassengers[passengerId] = {};
            }

            segmentPassengers[passengerId].fare = fare.name;
          });

          const description = `${travelType}: ${departureCity}/${arrivalCity}`;

          let details = `${departureStation} -> ${arrivalStation}\n`;
          details += localization.t('konnector sncf reference');
          details += `: ${orderInformations.reference}\n`;
          details += `${trainType} ${trainNumber}\n`;
          details += localization.t('konnector sncf class');
          details += `: ${trainClass}\n\n`;

          Object.keys(segmentPassengers).forEach((passengerId) => {
            const passengerName = passengers[passengerId];
            const segmentPassenger = segmentPassengers[passengerId];

            if (segmentPassenger) {
              let passengerPlace = '';
              if (segmentPassenger.placement !== undefined) {
                passengerPlace = localization.t('konnector sncf car');
                passengerPlace += ` ${segmentPassenger.placement.car} `;
                passengerPlace += localization.t('konnector sncf place');
                passengerPlace += ` ${segmentPassenger.placement.seat}`;
              }

              let passengerFare = '';
              if (segmentPassenger.fare !== undefined) {
                if (passengerPlace !== '') {
                  passengerFare = ' -';
                }

                passengerFare += ` ${segmentPassenger.fare}`;
              }

              details += `${passengerName}: ${passengerPlace}${passengerFare}`;
            }
          });

          const event = {
            description,
            details,
            id: departureDate + trainType + trainNumber,
            start: moment.tz(departureDate, moment.ISO_8601, momentZone)
                         .toISOString(),
            end: moment.tz(arrivalDate, moment.ISO_8601, momentZone)
                       .toISOString(),
            place: departureStation,
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
  saveDataAndFile(logger, Bill, fileOptions, ['bill'])(
      requiredFields, entries.bills, data, next);
}


function saveEvents(requiredFields, entries, data, next) {
  entries.events.nbCreations = 0;
  entries.events.nbUpdates = 0;

  async.eachSeries(entries.events, (event, cb) => {
    event.tags = [requiredFields.calendar];

    Event.createOrUpdate(event, (err, cozyEvent, changes) => {
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
    const localizationKey = 'notification bills';
    const options = {
      smart_count: entries.bills.filtered.length,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  if (entries.events.nbCreations > 0) {
    const localizationKey = 'notification events created';
    const options = {
      smart_count: entries.events.nbCreations,
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(localizationKey, options);
    } else {
      entries.notifContent += ` ${localization.t(localizationKey, options)}`;
    }
  }

  if (entries.nbUpdates > 0) {
    const localizationKey = 'notification events updated';
    const options = {
      smart_count: entries.events.nbUpdates,
    };
    if (entries.notifContent === undefined) {
      entries.notifContent = localization.t(localizationKey, options);
    } else {
      entries.notifContent += ` ${localization.t(localizationKey, options)}`;
    }
  }

  next();
}


function getPage(url, callback) {
  const options = {
    method: 'GET',
    uri: url,
    jar: true,
    headers: {
      'User-Agent': userAgent,
    },
  };

  return request(options, callback);
}


// ----------------------------------------------------------------------------
// Functions to parse old SNCF pages


// SNCF did not change the html pages for old orders, only for new ones
function getEventsOld(orderInformations, events, callback) {
  const uri = `http://espace-client.voyages-sncf.com/services-train/suivi-commande?pnrRef=${orderInformations.reference}&ownerName=${orderInformations.owner}&fromCustomerAccount=true`;

  // Try to get the detail order
  getPage(uri, (err, res, body) => {
    if (err) return callback(err);

    const $ = cheerio.load(body);
    const $subOrders = $('.submit.button-primary.btn');
    // Stop it.
    // This is a page composed of many orders.
    // Recursively fetch them individually.
    if ($subOrders.length !== 0) {
      const subOrdersUris = [];
      $subOrders.each(function forEachSubOrders() {
        const $subOrder = $(this);
        subOrdersUris.push($subOrder.attr('href'));
      });

      return async.eachSeries(subOrdersUris, (subOrderUri, cb) => {
        getEvents(subOrderUri, events, cb);
      }, callback);
    }

    // We'll parse french dates
    moment.locale('fr');

    // Franglish stuffs
    const $orderHeader = $('.entete-commande');
    // "Title"
    const $roundTrip = $orderHeader.find('span');
    const $ticketDetail = $orderHeader.parent().find('.retrait-billet-detail');
    const $travels = $ticketDetail.find('.outward, .inward');
    // Reference...
    const $folder = $('.folder-box');

    const reference = $folder.find('.reference-dossier span').text();
    const ticketChoice =
      $folder.parent().find('.types-retrait .chosen-mode-name').text();
    const label =
      `${$roundTrip.eq(0).text().trim()}/${$roundTrip.eq(1).text().trim()}`;

    $travels.each(function forEachTravels() {
      const $travel = $(this);
      const $date = $travel.find('.date-trajet');
      const $moreInfos = $travel.find('.travel_more_infos_table');

      const moreInfos = parseMoreInfos($, $moreInfos);
      const date = $date.find('p').eq(1).text()
                                        .trim();
      const travelType = $date.find('.label').text().trim();

      // When we have correpondances for example
      const $travelSegments = $travel.find('.travel');
      $travelSegments.each(function forEachTravelSegments() {
        const $travelSegment = $(this);
        const $departure = $travelSegment.find('.departure');
        const $arrival = $travelSegment.find('.arrival');

        // Yup, the generated HTML is just a joke.
        const beginHour = $departure.find('.hour p')
                                    .eq(1)
                                    .text()
                                    .trim();
        const beginStation = $departure.find('.station p')
                                       .eq(1)
                                       .text()
                                       .trim();
        const trainType =
          $departure.find('.train_picto').text()
                    .replace('Transporteur :', '')
                    .trim();
        const trainNumber =
          $departure.find('.train_number p').eq(1)
                                            .text()
                                            .trim();
        const trainInfo =
          $departure.find('.train_infos .train_class p').eq(1)
                                                        .text()
                                                        .trim();

        const arrivalHour = $arrival.find('.hour p').eq(1)
                                                    .text()
                                                    .trim();
        const arrivalStation = $arrival.find('.station p').eq(1)
                                                          .text()
                                                          .trim();

        const description = `${travelType}: ${label}`;

        let details = `${beginStation} -> ${arrivalStation}\n`;
        details += localization.t('konnector sncf reference');
        details += `: ${reference}\n`;
        details += localization.t('konnector sncf ticket choice');
        details += `: ${ticketChoice}\n`;
        details += `${trainType} ${trainNumber} - ${trainInfo}\n\n`;

        // Add more informations for this travel for each passenger
        Object.keys(moreInfos).forEach((passenger) => {
          const moreInfo = moreInfos[passenger].shift();
          // Sometimes we don't have "more informations" for all travels
          if (moreInfo) {
            details +=
              `${passenger}: ${moreInfo.fare} - ${moreInfo.place_details}`;
          }
        });

        const momentFormat = 'DD MMMM YYYY HH mm';
        // SNCF is in the french timezone
        const momentZone = 'Europe/Paris';

        const event = {
          description,
          details,
          id: date + trainType + trainNumber,
          start: moment.tz(`${date} ${beginHour}`, momentFormat, momentZone)
                .toISOString(),
          end: moment.tz(`${date} ${arrivalHour}`, momentFormat, momentZone)
              .toISOString(),
          place: beginStation,
        };

        events.push(event);
      });
    });

    return callback();
  });
}

function parseMoreInfos($, $moreInfos) {
  const moreInfos = {};
  const $rows = $moreInfos.find('tr');
  let passenger = null;

  $rows.each(function forEachRows() {
    const $row = $(this);

    // Changed passenger ?
    const $passengerLabel = $row.find('.passenger_label');
    if ($passengerLabel.length !== 0) {
      passenger = $passengerLabel.text().trim();
      moreInfos[passenger] = [];
    }

    // Get the infos
    const fare =
      $row.find('.fare_details .fare-name').text().replace(':', '')
                                                  .trim();

    // Place detail or "no reservation"
    let placeDetails = null;
    const $carPlace = $row.find('.place_details .car_place');
    if ($carPlace.length !== 0) {
      placeDetails = $carPlace.text().trim().replace(/\n/, ' ');
    } else {
      placeDetails = $row.find('.placement').text().trim();
    }

    // We push the new travel segment to this passenger
    moreInfos[passenger].push({
      fare,
      place_details: placeDetails,
    });
  });

  return moreInfos;
}
