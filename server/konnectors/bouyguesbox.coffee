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

InternetBill = cozydb.getModel 'InternetBill',
    date: Date
    vendor: String
    amount: Number
    fileId: String

InternetBill.all = (callback) ->
    InternetBill.request 'byDate', callback

# Konnector

module.exports =

    name: "Bouygues Box"
    slug: "bouyguesbox"
    description: 'konnector description bouygues box'
    vendorLink: "https://www.bouyguestelecom.fr/"

    fields:
        email: "text"
        password: "password"
        folderPath: "folder"
    models:
        phonebill: InternetBill

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        InternetBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"
        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, InternetBill)
            .use(saveDataAndFile log, InternetBill, 'bouygues', ['facture'])
            .use(linkBankOperation
                log: log
                model: InternetBill
                identifier: 'bouyg'
                dateDelta: 20
                amountDelta: 0.1
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"

                # TODO move this in a procedure.
                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification bouygues'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback null, notifContent


# Procedure to login to Bouygues website.
logIn = (requiredFields, bills, data, next) ->

    loginUrl = 'https://www.mon-compte.bouyguestelecom.fr/cas/login'
    billUrl = 'http://www.bouyguestelecom.fr/mon-compte/suivi-conso/factures'
    userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + \
                'Gecko/20100101 Firefox/36.0'

    # First request to grab the login form
    loginOptions =
        uri: loginUrl
        jar: true
        method: 'GET'
        headers:
            'User-Agent': userAgent

    request loginOptions, (err, res, body) ->
        return next err if err

        # Extract hidden values
        $ = cheerio.load body
        lt = $('input[name="lt"]').val()
        execution = $('input[name="execution"]').val()

        # Second request to log in (post the form).
        form =
            "username": requiredFields.email
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

        request loginOptions, (err, res, body) ->
            return next err if err

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
                next()


# Procedure to extract bill data from the page.
parsePage = (requiredFields, bills, data, next) ->
    baseDlUrl = 'https://www.bouyguestelecom.fr/mon-compte/' + \
                'suiviconso/index/facturepdffixe'
    bills.fetched = []

    # Load page to make it browseable easily.
    $ = cheerio.load data.html

    # We browse the bills table by processing each line one by one.
    $('.historique tr').each ->

        # If we find download information, it's a row with bill information
        urlData = $(this).find('.voirMaFacture a').attr('onclick')
        if urlData?

            # We get directly from the first field.
            date =  $(this).find('.eccogrisc:first-child').html()

            # Amount is in a weird field that contains nested spans. We only
            # get the five first chars of the element text.
            amount =  $(this).find('td:nth-child(2) span').text().substring 0, 5
            amount = amount.replace '€', ','

            # Build download url from data contained in the javascript code run
            # when the link is clicked.
            dataArray = urlData.split ','
            params =
                id: dataArray[4].replace /[\/'\s]/g, ''
                date: dataArray[5].replace /[\/'\s]/g, ''
                type: dataArray[6].replace /[\/'\s]/g, ''
                no_reference:dataArray[7].replace /[\/)'\s]/g, ''
            url = "#{baseDlUrl}?#{qs.stringify params}"

            if params.type is 'Bbox'
                # Build bill object.
                bill =
                    date: moment date, 'DD/MM/YYYY'
                    amount: amount.replace ',', '.'
                    pdfurl: url
                bills.fetched.push bill
    next()
