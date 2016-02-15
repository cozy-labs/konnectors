cozydb = require 'cozydb'

fs = require 'fs'
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
    prefix: "Online.net"
    date: true


# Models
Bill = require '../models/bill'

# Konnector
module.exports =

    name: "Online.net"
    slug: "online_net"
    description: 'konnector description online_net'
    vendorLink: "https://www.online.net/"

    fields:
        username: "text"
        password: "password"
        folderPath: "folder"
    models:
        bill: Bill

    init: (callback) ->
        callback()

    fetch: (requiredFields, callback) ->
        fileOptions =
            vendor: 'online_net'
            dateFormat: 'YYYYMMDD'

        log.info "Import started"
        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, Bill)
            .use(saveDataAndFile log, Bill, fileOptions, ['bill'])
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'online_net'
                dateDelta: 4
                amountDelta: 0.1
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification online_net'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback null, notifContent


# Procedure to login to Online.net website.
logIn = (requiredFields, bills, data, next) ->

    formUrl = 'https://console.online.net/en/login?o=1'
    loginUrl = 'https://console.online.net/login_check'
    billUrl = "https://console.online.net/en/bill/list"
    userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + \
                'Gecko/20100101 Firefox/36.0'

    # First request to grab the login form
    loginOptions =
        uri: formUrl
        jar: true
        method: 'GET'
        headers:
            'User-Agent': userAgent

    log.info 'Logging in on Online.net...'
    request loginOptions, (err, res, body) ->
        return next err if err

        # Extract hidden values
        $ = cheerio.load body
        crsfToken = $('input[name="_csrf_token"]').val()

        # Second request to log in (post the form).
        form =
            "_target_path": "https://console.online.net/en/account/home"
            "_submit": "Sign+in"
            "_username": requiredFields.username
            "_password": requiredFields.password
            "_csrf_token": crsfToken

        loginOptions =
            method: 'POST'
            followRedirect: false
            form: form
            jar: true
            uri: loginUrl
            headers:
                'User-Agent': userAgent

        request loginOptions, (err, res, body) ->
            return next err if err

            log.info 'Download bill HTML page...'

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
    baseDlUrl = "https://console.online.net/fr/bill/show/"
    bills.fetched = []
    dataIndices =
        'id': 0
        'date': 1
        'price': 4

    # Load page to make it browseable easily.
    $ = cheerio.load data.html

    # We browse the bills table by processing each line one by one.
    # Skip the first one (header)
    $rows = $('table.table.table-striped').eq(1).find('tr').slice(1)
    $rows.each ->
        $cells = $(this).find('td')

        date = $cells.eq(dataIndices['date']).text().trim()
        amount = $cells.eq(dataIndices['price']).text()
        id = $cells.eq(dataIndices['id']).text()

        # Build bill object.
        bill =
            date: moment date
            amount: amount.replace ' €', ''
            pdfurl: baseDlUrl + id
            vendor: 'Online.net'
            type: 'hosting'
        bills.fetched.push bill

    log.info 'Bill data parsed.'
    next()
