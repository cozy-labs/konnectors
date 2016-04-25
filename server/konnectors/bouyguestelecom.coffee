cozydb = require 'cozydb'

fs = require 'fs'
qs = require 'querystring'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
async = require 'async'
fetcher = require '../lib/fetcher'

filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
localization = require '../lib/localization_manager'
linkBankOperation = require '../lib/link_bank_operation'

log = require('printit')
    prefix: "Bouygues Telecom"
    date: true


# Models

PhoneBill = cozydb.getModel 'PhoneBill',
    date: Date
    vendor: String
    amount: Number
    fileId: String
    binaryId: String
    pdfurl: String

PhoneBill.all = (callback) ->
    PhoneBill.request 'byDate', callback

# Konnector

module.exports =

    name: "Bouygues Telecom"
    slug: "bouyguestelecom"
    description: 'konnector description bouygues'
    vendorLink: "https://www.bouyguestelecom.fr/"

    fields:
        phoneNumber: "text"
        password: "password"
        folderPath: "folder"
    models:
        phonebill: PhoneBill

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        PhoneBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"
        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, PhoneBill)
            .use(saveDataAndFile log, PhoneBill, 'bouygues', ['facture'])
            .use(linkBankOperation
                log: log
                model: PhoneBill
                identifier: 'bouyg'
                minDateDelta: 4
                maxDateDelta: 20
                amountDelta: 0.1
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification bouygues'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback null, notifContent


# Procedure to login to Bouygues website.
logIn = (requiredFields, bills, data, next) ->

    loginUrl = 'https://www.mon-compte.bouyguestelecom.fr/cas/login'
    billUrl = "https://www.bouyguestelecom.fr/parcours/mes-factures/historique"
    userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + \
                'Gecko/20100101 Firefox/36.0'

    # First request to grab the login form
    loginOptions =
        uri: loginUrl
        jar: true
        method: 'GET'
        headers:
            'User-Agent': userAgent

    log.info 'Logging in on Bouygues Website...'
    request loginOptions, (err, res, body) ->
        return next err if err

        # Extract hidden values
        $ = cheerio.load body
        lt = $('input[name="lt"]').val()
        execution = $('input[name="execution"]').val()

        # Second request to log in (post the form).
        form =
            "username": requiredFields.phoneNumber
            "password": requiredFields.password
            "lt": lt
            "execution": execution
            "_eventId": 'submit'

        loginOptions =
            method: 'POST'
            form: form
            jar: true
            uri: loginUrl
            headers:
                'User-Agent': userAgent

        log.info 'Successfully logged in.'
        request loginOptions, (err, res, body) ->
            return next err if err

            log.info 'Download bill HTML page...'
            # Third request to build the links of the bills
            options =
                method: 'GET'
                uri: billUrl
                jar: true
                headers:
                    'User-Agent': userAgent
            request options, (err, res, body) ->
                return next err if err
                data.html = body
                log.info 'Bill page downloaded.'
                next()


# Procedure to extract bill data from the page.
parsePage = (requiredFields, bills, data, next) ->
    baseDlUrl = "https://www.bouyguestelecom.fr"
    baseDlUrl += "/parcours/facture/download/index"
    bills.fetched = []

    # Set moment locale for the date parsing
    moment.locale('fr')

    # Load page to make it browseable easily.
    $ = cheerio.load data.html

    # We browse the bills table by processing each line one by one.
    $('.download-facture').each ->


        # Markup is not clean, we grab the date from the tag text.
        date =  $(this).text()
                    .trim()
                    .split(' ')
                    .splice(0, 2)
                    .join(' ')
                    .trim()

        # Amount is in a dirty field. We work on the tag text to extract data.
        amount = $(this).find('.small-prix').text().trim()
        amount = amount.replace '€', ','

        # Get the facture id and build the download url from it.
        id = $(this).attr('facture-id')
        params =
            id: id
        url = "#{baseDlUrl}?#{qs.stringify params}"

        # Build bill object.
        bill =
            date: moment(date, 'MMMM YYYY').add 14, 'days'
            amount: amount.replace ',', '.'
            pdfurl: url
        bills.fetched.push bill

    log.info 'Bill data parsed.'
    next()

