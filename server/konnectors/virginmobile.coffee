cozydb = require 'cozydb'
request = require 'request'
requestJSON = require 'request-json'
moment = require 'moment'

fetcher = require '../lib/fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Virgin Mobile"
    date: true

# Models
Bill = require '../models/bill'

# Konnector
module.exports =

    name: "Virgin Mobile"
    slug: "virginmobile"
    description: 'konnector description virginmobile'
    vendorLink: "https://www.virginmobile.fr/"

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
            .use(saveDataAndFile(log, Bill, 'virgin mobile', ['bill']))
            .use(linkBankOperation
                log: log
                model: Bill
                identifier: 'virgin mobile'
                dateDelta: 4
                amountDelta: 5
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification virginmobile'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


# Layer to login to Orange website.
logIn = (requiredFields, billInfos, data, next) ->

    signInOptions =
        method: 'POST'
        jar: true
        url: "https://espaceclient.virginmobile.fr/login_check"
        form:
            'login': requiredFields.login
            'password': requiredFields.password
            '_target_path': "factures-echeances"

    client = requestJSON.newClient "https://espaceclient.virginmobile.fr/"

    log.info 'Signing in'
    request signInOptions, (err, res, body) ->
        if err
            log.error "Signin failed"
            return next err

        client.headers["Cookie"] = res.headers["set-cookie"]

        # Download bill information page.
        log.info 'Fetching bills list'
        client.get "api/getFacturesData", (err, res, body) ->
            if err
                log.error 'An error occured while fetching bills list'
                return next err

            if body.success
                data.content = body.data
                next()
            else
                log.error "Bills list fetch failed"
                next "Could not fetch bills list"

# Layer to parse the fetched page to extract bill data.
parsePage = (requiredFields, bills, data, next) ->
    bills.fetched = []

    baseURL = "https://espaceclient.virginmobile.fr/api/getFacturePdf/"
    invoices = data.content.infoFacturation.invoices
    for inv in invoices
        if inv.pdfDispo
            bill =
                date: moment inv.invoiceDate, 'DD/MM/YYYY'
                amount: parseFloat(inv.amount.unite + '.' + inv.amount.centimes)
                pdfurl: baseURL + inv.invoiceNumber
                type: "phone"

            if bill.date? and bill.amount? and bill.pdfurl?
                bills.fetched.push bill

    log.info "Bill retrieved: #{bills.fetched.length} found"
    next()
