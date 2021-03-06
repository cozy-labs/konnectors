// Generated by CoffeeScript 1.11.1
var BankOperation, BankOperationLinker, async, moment,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

async = require('async');

moment = require('moment');

BankOperation = require('../models/bankoperation');

BankOperationLinker = (function() {
  function BankOperationLinker(options) {
    this.linkOperation = bind(this.linkOperation, this);
    this.linkOperationIfExist = bind(this.linkOperationIfExist, this);
    this.log = options.log;
    this.model = options.model;
    if (typeof options.identifier === 'string') {
      this.identifier = [options.identifier.toLowerCase()];
    } else {
      this.identifier = options.identifier.map(function(id) {
        return id.toLowerCase();
      });
    }
    this.amountDelta = options.amountDelta || 0.001;
    this.dateDelta = options.dateDelta || 15;
    this.minDateDelta = options.minDateDelta || this.dateDelta;
    this.maxDateDelta = options.maxDateDelta || this.dateDelta;
  }

  BankOperationLinker.prototype.link = function(entries, callback) {
    return async.eachSeries(entries, this.linkOperationIfExist, callback);
  };

  BankOperationLinker.prototype.linkOperationIfExist = function(entry, callback) {
    var date, endDate, endkey, startDate, startkey;
    date = new Date(entry.paidDate || entry.date);
    startDate = moment(date).subtract(this.minDateDelta, 'days');
    endDate = moment(date).add(this.maxDateDelta, 'days');
    startkey = (startDate.format("YYYY-MM-DDT00:00:00.000")) + "Z";
    endkey = (endDate.format("YYYY-MM-DDT00:00:00.000")) + "Z";
    return BankOperation.all({
      startkey: startkey,
      endkey: endkey
    }, (function(_this) {
      return function(err, operations) {
        if (err) {
          return callback(err);
        }
        return _this.linkRightOperation(operations, entry, callback);
      };
    })(this));
  };

  BankOperationLinker.prototype.linkRightOperation = function(operations, entry, callback) {
    var amount, amountDelta, i, identifier, j, len, len1, minAmountDelta, opAmount, operation, operationToLink, ref;
    operationToLink = null;
    try {
      amount = Math.abs(parseFloat(entry.amount));
      if ((entry.isRefund != null) && entry.isRefund) {
        amount *= -1;
      }
    } catch (error) {
      callback();
      return;
    }
    minAmountDelta = 2e308;
    for (i = 0, len = operations.length; i < len; i++) {
      operation = operations[i];
      opAmount = Math.abs(operation.amount);
      if ((entry.isRefund != null) && entry.isRefund) {
        opAmount *= -1;
      }
      amountDelta = Math.abs(opAmount - amount);
      ref = this.identifier;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        identifier = ref[j];
        if (operation.title.toLowerCase().indexOf(identifier) >= 0 && amountDelta <= this.amountDelta && amountDelta <= minAmountDelta) {
          operationToLink = operation;
          minAmountDelta = amountDelta;
          break;
        }
      }
    }
    if (operationToLink == null) {
      return callback();
    } else {
      return this.linkOperation(operationToLink, entry, callback);
    }
  };

  BankOperationLinker.prototype.linkOperation = function(operation, entry, callback) {
    var date, key;
    date = new Date(entry.date);
    key = (moment(date).format('YYYY-MM-DD')) + "T00:00:00.000Z";
    return this.model.request('byDate', {
      key: key
    }, (function(_this) {
      return function(err, entries) {
        if (err) {
          _this.log.raw(err);
          return callback();
        } else if (entries.length === 0) {
          return callback();
        } else {
          entry = entries[0];
          return operation.setBinaryFromFile(entry.fileId, function(err) {
            if (err) {
              _this.log.raw(err);
            } else {
              _this.log.debug("Binary " + operation.binary.file.id + " linked with operation:\n" + operation.title + " - " + operation.amount);
            }
            return callback();
          });
        }
      };
    })(this));
  };

  return BankOperationLinker;

})();

module.exports = function(options) {
  return function(requiredFields, entries, data, next) {
    var linker;
    linker = new BankOperationLinker(options);
    return linker.link(entries.fetched, next);
  };
};
