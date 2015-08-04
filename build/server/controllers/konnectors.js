// Generated by CoffeeScript 1.9.3
var Konnector;

Konnector = require('../models/konnector');

module.exports = {
  getKonnector: function(req, res, next) {
    return Konnector.find(req.params.konnectorId, function(err, konnector) {
      if (err) {
        return next(err);
      } else if (konnector == null) {
        return res.send(404);
      } else {
        konnector.injectEncryptedFields();
        req.konnector = konnector;
        return next();
      }
    });
  },
  show: function(req, res, next) {
    return res.send(req.konnector);
  },
  "import": function(req, res, next) {
    var date;
    if (req.konnector.isImporting) {
      return res.send(400, {
        message: 'konnector is importing'
      });
    } else {
      if (req.body.fieldValues.date != null) {
        if (req.body.fieldValues.date !== '') {
          date = req.body.fieldValues.date;
        }
        delete req.body.fieldValues.date;
      }
      return req.konnector.updateFieldValues(req.body, function(err) {
        var poller;
        if (err != null) {
          return next(err);
        } else {
          res.send(200);
          poller = require("../lib/konnector_poller");
          poller.handleTimeout(date, req.konnector);
          if (date == null) {
            return req.konnector["import"](function(err) {
              if (err != null) {
                return console.log(err);
              }
            });
          }
        }
      });
    }
  }
};
