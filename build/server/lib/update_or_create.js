'use strict';

/* Update or create each document in the entries[model.displayName] Array.
  Document are updated if one document in base, with the same value for the
  fields specified in filter param is in database.
  @param log  a pirntit conpatible logger.
  @param model a cozydb DocType model
  @param filter a list of field to look at to find similar
  @param options to be used later.
*/

var async = require('async');

module.exports = function (log, model, filter, options) {
  return function (requiredFields, entries, data, next) {
    var modelName = model.displayName.toLowerCase() + 's';

    var news = entries[modelName];
    if (!news || news.length === 0) {
      log.debug('No ' + modelName + ' to save.');
      next();
    }

    data.updated = data.updated || {};
    data.created = data.created || {};

    data.updated[modelName] = 0;
    data.created[modelName] = 0;

    model.all(function (err, docs) {
      if (err) {
        return next(err);
      };

      async.eachSeries(news, function (entry, cb) {
        var toUpdate = docs.find(function (doc) {
          return filter.reduce(function (good, k) {
            return good && doc[k] === entry[k];
          }, true);
        });

        if (toUpdate) {
          data.updated[modelName]++;
          toUpdate.updateAttributes(entry, cb);
        } else {
          data.created[modelName]++;
          model.create(entry, cb);
        }
      }, next);
    });
  };
};