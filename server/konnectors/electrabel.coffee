cozydb = require 'cozydb'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'

File = require '../models/file'
fetcher = require '../lib/fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Electrabel"
    date: true


# Models

Bill = require '../models/bill'


# Konnector

module.exports =

    name: "Electrabel"
    slug: "electrabel"
    description: 'konnector description electrabel'
    vendorLink: "https://www.electrabel.be/"

    fields:
        login: "text"
        password: "password"
        folderPath: "folder"
    models:
        bill: Bill

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        Bill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, Bill)
            .use(saveDataAndFile log, Bill, 'electrabel', ['facture'])
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'electrabel'
                dateDelta: 10
                amountDelta: 0.1
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

# Procedure to login to Electrabel website.
logIn = (requiredFields, billInfos, data, next) ->

    loginUrl = "https://www.electrabel.be/fr/particulier/login"
    billUrl = "https://www.electrabel.be/fr/particulier/\
espace-client/facture/l.a/eservices/private/billing\
/billviewer?loadedFromPage=true&fragmentName=\
invoiceListFragment&contractAccountID="

    form =
        "l.url": "/fr/particulier/espace-client/espace-client-en-ligne"
        "l.userName": requiredFields.login
        "l.password": requiredFields.password

    options =
        method: 'POST'
        form: form
        jar: true
        url: loginUrl

    request options, (err, res, body) ->
        isNoLocation = not res.headers.location?
        isNot302 = res.statusCode isnt 302


        if err? or isNoLocation or isNot302
            log.error "Authentification error"
            next 'bad credentials'

        else

            location = res.headers.location
            options =
                method: 'GET'
                jar: true
                url: location
            request options, (err, res, body) ->
                if err
                    next err
                else
                    $ = cheerio.load body
                    clientID = $('#contract-account-id').attr 'value'
                    options =
                        method: 'GET'
                        jar: true
                        url: billUrl + clientID
                    request options, (err, res, body) ->
                        if err?
                            next err
                        else
                            data.html = body
                            data.clientID= clientID
                            request.cookie "contractAccountID=#{clientID}"
                            next()


# Parse the fetched page to extract bill data.
parsePage = (requiredFields, bills, data, next) ->

    bills.fetched = []

    return next() if not data.html?

    $ = cheerio.load data.html

    $('tr').each ->
        $ = cheerio.load $(this).html()
        amount = $('td[class=last]').text()
        if amount.length isnt 0
            amount = amount.replace ' €', ''
            amount = amount.replace ',', '.'
            amount = parseFloat amount
            billID = $('a').find('span').text()

            pdfUrl = "https://www.electrabel.be/eservices/private/billing/\
billviewer?invoiceId="+billID+ "&contractAccountID="+data.clientID
            date = $('td[class=first]').text()
            date = moment date, 'DD-MM-YYYY', 'fr'
            bill =
                amount: amount
                date: date
                vendor: 'Electrabel'
                pdfurl: pdfUrl
                type: 'energy'
            bills.fetched.push bill
    next()
