ovhFetcher = require '../lib/ovh_fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'
baseKonnector = require '../lib/base_konnector'

Bill = require '../models/bill'

module.exports =
    createNew: (ovhApi, name, slug) ->

        fileOptions =
            vendor: slug
            dateFormat: 'YYYYMMDD'

        fakeLogger =
            info: (text) -> connector?.logger.info(text)
            error: (text) -> connector?.logger.error(text)
            warn: (text) -> connector?.logger.warn(text)
            debug: (text) -> connector?.logger.debug(text)

        ovhFetcherInstance = ovhFetcher.new(ovhApi, slug, fakeLogger)

        fetchBills = (requiredFields, entries, body, next) ->
            ovhFetcherInstance.fetchBills(requiredFields, entries, body, next)

        return connector = baseKonnector.createNew
            name: name

            fields:
                loginUrl: "link"
                token: "hidden"
                folderPath: "folder"

            models: [Bill],

            fetchOperations: [
              fetchBills,
              filterExisting(fakeLogger, Bill)
              saveDataAndFile(fakeLogger, Bill, fileOptions, ['bill']),
              linkBankOperation
                  log: fakeLogger
                  model: Bill
                  identifier: slug
                  dateDelta: 4
                  amountDelta: 0.1
            ]
