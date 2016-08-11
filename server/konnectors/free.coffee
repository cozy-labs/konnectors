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
    prefix: "Free"
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

    name: "Free"
    slug: "free"
    description: 'konnector description free'
    vendorLink: "https://www.free.fr/"

    fields:
        login: "text"
        password: "password"
        folderPath: "folder"
    models:
        internetbill: InternetBill

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
            .use(saveDataAndFile log, InternetBill, 'free', ['facture'])
            .use(linkBankOperation
                log: log
                model: InternetBill
                identifier: ['free telecom', 'free hautdebit']
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

# Procedure to login to Free website.
logIn = (requiredFields, billInfos, data, next) ->

    loginUrl = "https://subscribe.free.fr/login/login.pl"
    billUrl = "https://adsl.free.fr/liste-factures.pl"

    form =
        "pass": requiredFields.password
        "login": requiredFields.login

    options =
        method: 'POST'
        form: form
        jar: true
        url: loginUrl

    request options, (err, res, body) ->

        isNoLocation = not res.headers.location?
        isNot302 = res.statusCode isnt 302
        isError = res.headers.location? and \
            res.headers.location.indexOf("error") isnt -1

        if err or isNoLocation or isNot302 or isError
            log.error "Authentification error"
            next 'bad credentials'

        else
            location = res.headers.location
            parameters = location.split('?')[1]
            url = "#{billUrl}?#{parameters}"
            request.get url, (err, res, body) ->
                if err then next err
                else
                    data.html = body
                    next()


# Parse the fetched page to extract bill data.
parsePage = (requiredFields, bills, data, next) ->

    bills.fetched = []

    return next() if not data.html?

    $ = cheerio.load data.html
    $('.pane li').each ->
        amount = $($(this).find('strong').get(1)).html()
        amount = amount.replace(' Euros', '').replace('&euro;', '')
        amount = amount.replace(',', '.').trim()
        amount = parseFloat amount

        pdfUrl = $(this).find('.last a').attr 'href'
        pdfUrl = "https://adsl.free.fr/#{pdfUrl}"

        month = pdfUrl.split('&')[2].split('=')[1]
        date = moment month, 'YYYYMM'

        bill =
            amount: amount
            date: date
            vendor: 'Free'

        bill.pdfurl = pdfUrl if date.year() > 2011
        bills.fetched.push bill
    next()
