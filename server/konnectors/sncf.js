'use strict';

const async = require('async');
const cheerio = require('cheerio');
const moment = require('moment');
const request = require('request');

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
    getOrderHistoryPage,
    parseOrderHistoryPage,
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


function getOrderHistoryPage(requiredFields, entries, data, next) {
  const url = 'https://espace-client.voyages-sncf.com/espaceclient/ordersconsultation/showOrdersForAjaxRequest?pastOrder=true&onlyUsedOrder=false&pageToLoad=1';

  connector.logger.info('Download orders history HTML page...');
  getPage(url, (err, res, body) => {
    if (err) return next(err);

    data.html = body;
    connector.logger.info('Orders history page downloaded.');
    return next();
  });
}


function parseOrderHistoryPage(requiredFields, entries, data, next) {
  const $ = cheerio.load(data.html);

  // Parse the orders page
  const $rows = $('table tbody tr:not(:last-child)');
  const table = parseSNCFTable($, $rows);
  const informations = table.informations;
  informations.forEach((information) => {
    const bill = {
      date: moment(information.orderDate, 'DD/MM/YYYY'),
      amount: information.amount,
      vendor: 'SNCF',
      type: 'transport',
      content: `${information.labelOrder} - ${information.dates}`,
    };

    entries.bills.fetched.push(bill);
  });

  next();
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

  // Parse the orders page
  const $rows = $('table tbody tr:not(:last-child)');
  const table = parseSNCFTable($, $rows);
  const informations = table.informations;
  const detailPages = table.detailPages;

  // console.log(informations);
  // console.log(detailPages);
  informations.forEach((information) => {
    const bill = {
      date: moment(information.orderDate, 'DD/MM/YYYY'),
      amount: information.amount,
      vendor: 'SNCF',
      type: 'transport',
      content: `${information.labelOrder} - ${information.dates}`,
    };

    entries.bills.fetched.push(bill);
  });

  // Fetch the detail of each order (for events)
  async.eachSeries(Object.keys(detailPages), (date, cb) => {
    connector.logger.info(`Fetching order(s) of ${date}.`);
    getEvents(detailPages[date], entries.events, cb);
  }, next);
}


function getEvents(uri, events, callback) {
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
      const date = $date.find('p').eq(1).text().trim();
      const travelType = $date.find('.label').text().trim();

      // When we have correpondances for example
      const $travelSegments = $travel.find('.travel');
      $travelSegments.each(function forEachTravelSegments() {
        const $travelSegment = $(this);
        const $departure = $travelSegment.find('.departure');
        const $arrival = $travelSegment.find('.arrival');

        // Yup, the generated HTML is just a joke.
        const beginHour = $departure.find('.hour p').eq(1).text().trim();
        const beginStation = $departure.find('.station p').eq(1).text().trim();
        const trainType =
          $departure.find('.train_picto').text()
                    .replace('Transporteur :', '').trim();
        const trainNumber =
          $departure.find('.train_number p').eq(1).text().trim();
        const trainInfo =
          $departure.find('.train_infos .train_class p').eq(1).text().trim();

        const arrivalHour = $arrival.find('.hour p').eq(1).text().trim();
        const arrivalStation = $arrival.find('.station p').eq(1).text().trim();

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
        const event = {
          description,
          details,
          id: date + trainType + trainNumber,
          start: moment(`${date} ${beginHour}`, momentFormat),
          end: moment(`${date} ${arrivalHour}`, momentFormat),
          place: beginStation,
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
    const localizationKey = 'notification sncf bills';
    const options = {
      smart_count: entries.bills.filtered.length,
    };
    entries.notifContent = localization.t(localizationKey, options);
  }

  if (entries.events.nbCreations > 0) {
    const localizationKey = 'notification sncf events creation';
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
    const localizationKey = 'notification sncf events update';
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


function parseSNCFTable($, $rows) {
  const dataIndices = {
    refOrder: 0,
    labelOrder: 1,
    dates: 2,
    price: 3,
    orderDate: 5,
    detailPage: 6,
  };
  const informations = [];
  const detailPages = {};

  // Parse the orders page
  $rows.each(function forEachRows() {
    const $cells = $(this).find('td');

    const refOrder = $cells.eq(dataIndices.refOrder).find('p').text().trim();
    const labelOrder =
      $cells.eq(dataIndices.labelOrder).find('p').text().trim();
    const price = $cells.eq(dataIndices.price).find('div').text().trim();
    const orderDate =
      $cells.eq(dataIndices.orderDate).find('div').text().trim();
    const detailPage =
      $cells.eq(dataIndices.detailPage).find('a').attr('href');

    const $dates = $cells.eq(dataIndices.dates).find('p');
    let dates = $dates.eq(0).text().trim();
    if ($dates.length > 1) {
      dates += ` - ${$dates.eq(1).text().trim()}`;
    }

    // price === '' ---> canceled travel
    // So we don't add it to the bills
    if (price !== '') {
      informations.push({
        refOrder,
        labelOrder,
        dates,
        orderDate: moment(orderDate, 'DD/MM/YYYY'),
        amount: price.replace('€', ''),
        vendor: 'SNCF',
        type: 'transport',
      });

      detailPages[orderDate] = detailPage;
    }
  });

  return {
    informations,
    detailPages,
  };
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
      $row.find('.fare_details .fare-name').text().replace(':', '').trim();

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
