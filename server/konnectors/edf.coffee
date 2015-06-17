americano = require 'americano-cozy'

fs = require 'fs'
qs = require 'querystring'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
async = require 'async'
fetcher = require '../lib/fetcher'

filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
localization = require '../lib/localization_manager'
linkBankOperation = require '../lib/link_bank_edf'

log = require('printit')
    prefix: "EDF"
    date: true


# Models
PaymentSchedule = americano.getModel 'PaymentSchedule',
    organisation: String
    number: Number
    receiptDate: String
    scheduleDate: String
    paid: Boolean
    amount: Number
    amountElectricity: Number
    amountGas: Number

PaymentSchedule.all = (callback) ->
    PaymentSchedule.request 'byDate', callback

# Konnector

module.exports =

    name: "Edf"
    slug: "edf"
    description: 'konnector description edf'
    vendorLink: "https://www.edf.fr/"
    fields:
        phoneNumber: "text"
        password: "password"
        folderPath: "folder"

    models:
        PaymentSchedule: PaymentSchedule

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.receiptDate, doc
        PaymentSchedule.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        PaymentSchedule.all (err, entries)->
            if err
                @log.raw err
                callback()

            log.info entries

            linkBankOperation(
                    log: log
                    model: PaymentSchedule
                    identifier: 'edf'
                    minDateDelta: 4
                    maxDateDelta: 20
                    amountDelta: 0.1
                )(entries, callback)
