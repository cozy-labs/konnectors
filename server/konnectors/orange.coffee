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
    prefix: "Orange"
    date: true


# Models

Bill = require '../models/bill'


# Konnector

module.exports =

    name: "Orange"
    slug: "orange"
    description: 'konnector description orange'
    vendorLink: "https://www.orange.fr/"

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
            .use(saveDataAndFile(log, Bill, 'orange', ['bill']))
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'orange'
                dateDelta: 12
                amountDelta: 5
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification orange'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


# Layer to login to Orange website.
logIn = (requiredFields, billInfos, data, next) ->

    logInOptions =
        method: 'GET'
        jar: true
        url: "https://id.orange.fr/auth_user/bin/auth_user.cgi"

    signInOptions =
        method: 'POST'
        jar: true
        url: "https://id.orange.fr/auth_user/bin/auth_user.cgi"
        form:
            'credential': requiredFields.login
            'password': requiredFields.password

    billOptions =
        method: 'GET'
        jar: true
        url: "https://m.espaceclientv3.orange.fr/?page=factures-archives"


    log.info 'Get login form'
    # Get cookies from login page.
    request logInOptions, (err, res, body) ->
        if err then next err

        # Log in orange.fr
        log.info 'Logging in'
        request signInOptions, (err, res, body) ->
            if err
                log.error 'Login failed'
                log.raw err
            else
                log.info 'Login succeeded'

                response = JSON.parse body
                if response.credential? and response.password?
                    error = if response.credential? then response.credential
                    else response.password
                    next new Error(error)
                else
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
    $('ul.factures li').each ->

        firstCell = $(this).find('span.date')
        secondCell = $(this).find('span.montant')
        thirdCell = $(this).find('span.telecharger')

        # Add a new bill information object.
        bill =
            date: moment firstCell.html(), 'DD/MM/YYYY'
            amount: parseFloat(secondCell
                .html()
                .replace(' €', '')
                .replace(',', '.')
            )
            pdfurl: thirdCell.find('a').attr 'href'
            type: 'phone'
            vendor: 'Orange'

        bills.fetched.push bill if bill.date? and bill.amount?

    log.info "Bill retrieved: #{bills.fetched.length} found"
    next()
