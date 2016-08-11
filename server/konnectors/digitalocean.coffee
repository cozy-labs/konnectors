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
    prefix: "Digital Ocean"
    date: true


# Models

Bill = require '../models/bill'


# Konnector

module.exports =

    name: "Digital Ocean"
    slug: "digitalocean"
    description: 'konnector description digital ocean'
    vendorLink: "https://www.digitalocean.com/"

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
            .use(saveDataAndFile log, Bill, 'digital_ocean', ['bill'])
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'ocean'
                dateDelta: 4
                amountDelta: 5
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification bills'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


# Layer to login to Digital ocean website.
logIn = (requiredFields, billInfos, data, next) ->

    logInOptions =
        method: 'GET'
        jar: true
        url: "https://cloud.digitalocean.com/login"

    signInOptions =
        method: 'POST'
        jar: true
        url: "https://cloud.digitalocean.com/sessions"
        form:
            'user[email]': requiredFields.login
            'user[password]': requiredFields.password
            commit: 'Log+In'

    billOptions =
        method: 'GET'
        jar: true
        url: "https://cloud.digitalocean.com/settings/billing"


    # Get authenticity token from login form.
    request logInOptions, (err, res, body) ->
        if err then next err
        $ = cheerio.load body
        token = $("input[name=authenticity_token]").val()

        # Log in digitalocean.com
        signInOptions.form.authenticity_token = token
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

    log.info 'Parsing bill pages'
    # Anaylyze bill listing table.
    $('table.listing tr').each ->

        # For each line, check if line is an invoice line: second
        # cell contains Invoice in its content.
        secondCell = $(this).find('td').get(1)
        if secondCell? and $(secondCell).html().indexOf('Invoice') > -1

            # Extract bill information from the invoice line.
            firstCell = $ $(this).find('td').get(0)
            thirdCell = $ $(this).find('td').get(2)
            fourthCell = $ $(this).find('td').get(3)
            pdfurlPrefix = 'https://cloud.digitalocean.com'

            # Add a new bill information object.
            bills.fetched.push
                date: moment firstCell.html()
                amount: parseFloat thirdCell.html().replace '$', ''
                pdfurl: pdfurlPrefix + fourthCell.find('a').attr 'href'
                vendor: 'Digital Ocean'
                type: 'hosting'

    if bills.fetched.length is 0
        log.error "No bills retrieved"
        next('no bills retrieved')
    else
        log.info "Bill parsed: #{bills.fetched.length} found"
        next()
