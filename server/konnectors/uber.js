var cozydb = require('cozydb');
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var moment = require('moment');

var baseKonnector = require('../lib/base_konnector');

var log = require('printit')({
  prefix: "Uber",
  date: true
});

var Bill = require('../models/bill');


var connector = module.exports = baseKonnector.createNew({
  name: "Uber",
  fields: {
    login: "text",
    password: "password",
    folderPath: "folder"
  },
  models: [Bill],
  fetchOperations: [
    logIn
  ]
});

function logIn(requiredFields,bills,data,next) = {
  var logInOptions = {
    method: 'GET',
    jar: true,
    url: "https://login.uber.com/login"
  };
  request(logInOptions, function (err, res, body){
    if (err) return next(err);

    var $ = cheerio.load(body);
    var token = $("input[name=_csrf_token]").val();

    var signInOptions = {
      method: 'POST',
      jar: true,
      url: "https://login.uber.com/login",
      form: {
        'email': requiredFields.login,
        'password': requiredFields.password,
        '_csrf_token': token
      }
    };

    log.info('Logging in');

    request(signInOptions, function(err, res, body) {
      if (err) {
        log.error('Login failed');
        log.raw(err);
        next(err);
      } else {
        log.info('Login succeeded');
        log.info('Fetch trips info');

        var tripsOptions = {
          method: 'GET',
          jar: true,
          url: "https://riders.uber.com/trips"
        };
        request(tripsOptions, funtion (err, res, body){
          if (err) {
            log.error('An error occured while fetching trips information');
            log.raw(err);
            next(err);
          } else {
            log.info('Fetch trips information succeded');
            data.tripsPage = body;
            next();
          }
        });
      }
    });
  })
};

function getTrips(requiredFields,bills,data,next){
  var $ = cheerio.load(data.tripsPage);
  var trips = $("tr[class=trip-expand__origin]");

};
