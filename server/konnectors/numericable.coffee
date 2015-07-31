cozydb = require 'cozydb'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'

fetcher = require '../lib/fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Numericable"
    date: true


# Models

Bill = cozydb.getModel 'Bill',
    vendor: {type: String, default: 'Internet'}
    date: Date
    amount: Number
    
# Konnector

module.exports =

    name: "Numéricable"
    slug: "numericable"
    description: 'Numéricable konnector'
    vendorLink: "https://www.numericable.fr/"

    fields:
        login: "text"
        password: "password"
        folderPath: "folder"
    models:
        bill: Bill

    # Define model requests.
    init: (callback) ->
        # Nothing to do here.
        callback()

    fetch: (requiredFields, callback) ->
        log.info "Import started"

        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, Bill)
            .use(saveDataAndFile(log, Bill, 'numericable', ['bill']))
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'numericable'
                dateDelta: 4
                amountDelta: 5
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification numéricable'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


# Layer to login to Orange website.
logIn = (requiredFields, billInfos, data, next) ->

    logInOptions =
        method: 'GET'
        jar: true
        url: "https://connexion.numericable.fr/Oauth/Oauth.php"

    signInOptions =
        method: 'POST'
        jar: true
        url: "https://connexion.numericable.fr/Oauth/login/"
        form:
            'login': requiredFields.login
            'pwd': requiredFields.password

    billOptions =
        method: 'GET'
        jar: true
        url: "https://moncompte.numericable.fr/pages/billing/Invoice.aspx"


    log.info 'Get login form'
    # Get cookies from login page.
    request logInOptions, (err, res, body) ->
        if err then next err

        # Log in connexion.numericable.fr
        log.info 'Logging in'
        request signInOptions, (err, res, body) ->
            if err
                log.error 'Login failed'
                log.raw err
            else
                log.info 'Login succeeded'

                # Download bill information page.
                log.info 'Fetch bill info'
                request billOptions, (err, res, body) ->
                    if err
                        log.error 'An error occured while fetching bills'
                        console.log err
                        next err
                    else
                        log.info 'Fetch bill info succeeded'
                        data.html = body
                        next()


# Layer to parse the fetched page to extract bill data.
parsePage = (requiredFields, bills, data, next) ->
    bills.fetched = []
    $ = cheerio.load data.html

    # Anaylyze bill listing table.
    log.info 'Parsing bill pages'
    $('#facture > div').each ->

        billDate = $(this).find('h2 span')
        billTotal = $(this).find('p.right')
        billLink = $(this).find('a.linkBtn')

        # Add a new bill information object.
        bill =
            date: moment billDate.html(), 'DD/MM/YYYY'
            amount: parseFloat(billTotal
                .html()
                .replace(' €', '')
                .replace(',', '.')
            )
            pdfurl: billLink.attr 'href'
            vendor: 'Numéricable'

        bills.fetched.push bill if bill.date? and bill.amount?

    log.info "Bill retrieved: #{bills.fetched.length} found"
    next()
