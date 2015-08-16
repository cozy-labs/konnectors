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
    prefix: "numericable"
    date: true

# Models
Bill = require '../models/bill'

# Konnector
module.exports =
    name: "Numéricable"
    slug: "numericable"
    description: 'konnector description numericable'
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
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification numericable'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


# Layer to login to Numéricable website.
logIn = (requiredFields, billInfos, data, next) ->
    appKeyOptions =
        method: 'GET'
        jar: true
        url: "https://moncompte.numericable.fr/pages/connection/Login.aspx"

    logInOptions =
        method: 'POST'
        jar: true
        url: "https://connexion.numericable.fr/Oauth/Oauth.php"
        form:
            'action': "connect"
            'linkSSO': "/pages/connection/Login.aspx?link=HOME"
            'appkey': ""
            'isMobile': ""

    redirectOptions =
        method: 'POST'
        jar: true
        url: "https://connexion.numericable.fr"

    signInOptions =
        method: 'POST'
        jar: true
        url: "https://connexion.numericable.fr/Oauth/login/"
        form:
            'login': requiredFields.login
            'pwd': requiredFields.password

    tokenAuthOptions =
        method: 'POST'
        jar: true
        url: "https://moncompte.numericable.fr/pages/connection/Login.aspx?link=HOME"
        qs:
            accessToken: ""

    billOptions =
        method: 'GET'
        jar: true
        uri: "https://moncompte.numericable.fr/pages/billing/Invoice.aspx"

    log.info 'Getting appkey'
    request appKeyOptions, (err, res, body) ->
        return next err if err

        $ = cheerio.load body
        appKey = $('#PostForm input[name="appkey"]').attr "value"
        return next "Could not retrieve app key" if not appKey

        logInOptions.form.appkey = appKey

        log.info 'Logging in'
        request logInOptions, (err, res, body) ->
            if err
                log.error 'Login failed'
                return next err

            log.info 'Signing in'
            request signInOptions, (err, res, body) ->
                if err
                    log.error 'Signin failed'
                    return next err

                redirectURL = res.headers.location
                return next "Could not retrieve redirect URL" if not redirectURL

                redirectOptions.url += redirectURL

                log.info "Fetching access token"
                request redirectOptions, (err, res, body) ->
                    if err
                        log.error 'Token fetching failed'
                        return next err

                    $ = cheerio.load body
                    accessToken = $("#accessToken").attr "value"
                    if not accessToken
                        return next "Could not retrieve access token"

                    tokenAuthOptions.qs.accessToken = accessToken

                    log.info "Authenticating by token"
                    request tokenAuthOptions, (err, res, body) ->
                        if err
                            log.error 'Authentication by token failed'
                            return next err

                        log.info 'Fetching bills page'
                        request billOptions, (err, res, body) ->
                            if err
                                log.error 'An error occured while fetching ' + \
                                'bills page'
                                return next err

                            data.html = body
                            next()


# Layer to parse the fetched page to extract bill data.
parsePage = (requiredFields, bills, data, next) ->
    bills.fetched = []
    $ = cheerio.load data.html
    baseURL = "https://moncompte.numericable.fr"

    # Analyze bill listing table.
    log.info 'Parsing bill page'

    #First bill
    firstBill = $("#firstFact")
    billDate = firstBill.find("h2 span")
    billTotal = firstBill.find('p.right')
    billLink = firstBill.find('a.linkBtn')

    bill =
        date: moment billDate.html(), 'DD/MM/YYYY'
        amount: parseFloat(billTotal
            .html()
            .replace(' €', '')
            .replace(',', '.')
        )
        pdfurl: baseURL + billLink.attr "href"
        type: 'internet'
        vendor: 'Numéricable'

    bills.fetched.push bill if bill.date? and bill.amount? and bill.pdfurl?

    #Other bills
    $('#facture > div[id!="firstFact"]').each ->
        billDate = $(this).find('h3').html().substr 3
        billTotal = $(this).find('p.right')
        billLink = $(this).find('a.linkBtn')

        # Add a new bill information object.
        bill =
            date: moment billDate, 'DD/MM/YYYY'
            amount: parseFloat(billTotal
                .html()
                .replace(' €', '')
                .replace(',', '.')
            )
            pdfurl: baseURL + billLink.attr 'href'
            type: 'internet'
            vendor: 'Numéricable'

        bills.fetched.push bill if bill.date? and bill.amount? and bill.pdfurl?

    log.info "#{bills.fetched.length} bills retrieved"

    if not bills.fetched.length
        next "No bills retrieved"
    else
        next()
