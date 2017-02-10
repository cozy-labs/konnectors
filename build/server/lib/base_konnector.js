'use strict';

var _ = require('lodash');
var printit = require('printit');
var slugify = require('cozy-slug');
var fetcher = require('./fetcher');

module.exports = {

  /*
   * Add common features to given konnector:
   *
   * * build its slug.
   * * build description translation key based on slug.
   * * add a dedicated logger.
   * * Change the array model to object (dirty hack to ensure backward
   *   compatibility).
   * * Add a default fetch function that runs operations set at konnector
   * level.
   */
  createNew: function createNew(konnector) {
    var slug = slugify(konnector.slug || konnector.name);
    slug = slug.replace(/(-|\.)/g, '_');

    var logger = printit({
      prefix: konnector.name,
      date: true
    });

    var modelsObj = {};
    konnector.models.forEach(function (model) {
      modelsObj[model.displayName.toLowerCase()] = model;
    });

    return _.assignIn(konnector, {
      slug: slug,
      description: 'konnector description ' + slug,
      logger: logger,
      models: modelsObj,

      fetch: function fetch(requiredFields, callback) {
        var importer = fetcher.new();
        konnector.fetchOperations.forEach(function (operation) {
          importer.use(operation);
        });
        importer.args(requiredFields, {}, {});
        importer.fetch(function (err, fields, entries) {
          if (err) {
            konnector.logger.error('Import failed.');
            callback(err);
          } else {
            konnector.logger.info('Import succeeded.');
            callback(null, entries.notifContent);
          }
        });
      }

    });
  }
};