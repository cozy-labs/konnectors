const _ = require('lodash')
const printit = require('printit')
const slugify = require('cozy-slug')
const fetcher = require('./fetcher')

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
  createNew: function (konnector) {
    var slug = slugify(konnector.slug || konnector.name);
    slug = slug.replace(/(-|\.)/g, '_');

    var logger = printit({
      prefix: konnector.name,
      date: true
    });

    var modelsObj = {}
    konnector.models.forEach((model) => {
      modelsObj[model.displayName.toLowerCase()] = model
    });

    return _.assignIn(konnector, {
      slug: slug,
      description: `konnector description ${slug}`,
      logger: logger,
      models: modelsObj,

      fetch: function (requiredFields, callback) {
        var importer = fetcher.new();
        konnector.fetchOperations.forEach((operation) => {
          importer.use(operation);
        });
        importer.args(requiredFields, {}, {});
        importer.fetch((err, fields, entries) => {
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

}
