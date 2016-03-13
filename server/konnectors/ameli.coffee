cozydb = require 'cozydb'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'
async = require 'async'

File = require '../models/file'
fetcher = require '../lib/fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Ameli"
    date: true

# Models

HealthBill = cozydb.getModel 'HealthBill',
    date: Date
    vendor: String
    type: String
    amount: Number
    fileId: String

HealthBill.all = (callback) ->
    HealthBill.request 'byDate', callback

# Konnector

module.exports =

    name: "Ameli"
    slug: "ameli"
    description: 'konnector description ameli'
    vendorLink: "http://www.ameli.fr/"

    fields:
        login: "text"
        password: "password"
        folderPath: "folder"
    models:
        healthBill: HealthBill

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        HealthBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetcher.new()
            .use(logIn)
            .use(parsePage)
            .use(filterExisting log, HealthBill)
            .use(saveDataAndFile log, HealthBill, 'ameli', ['health'])
            .use(linkBankOperation
                log: log
                model: HealthBill
                identifier: 'C.P.A.M.'
                dateDelta: 10
                amountDelta: 0.1
            )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification ameli'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent

# Procedure to login to Ameli website.
logIn = (requiredFields, billInfos, data, next) ->

    loginUrl = "https://assure.ameli.fr/PortailAS/appmanager/PortailAS/" + \
    "assure?_nfpb=true&_pageLabel=as_login_page"

    submitUrl = "https://assure.ameli.fr/PortailAS/appmanager/PortailAS/" + \
    "assure?_nfpb=true&_windowLabel=connexioncompte_2&connexioncompte_2_" + \
    "actionOverride=/portlets/connexioncompte/validationconnexioncompte&" + \
    "_pageLabel=as_login_page"
    
    reimbursementUrl = "https://assure.ameli.fr/PortailAS/appmanager/" + \
    "PortailAS/assure?_nfpb=true&_pageLabel=as_dernier_paiement_page"

    form =
        "connexioncompte_2numSecuriteSociale": requiredFields.login
        "connexioncompte_2codeConfidentiel": requiredFields.password
        "connexioncompte_2actionEvt": "connecter"
        "submit": "Valider"

    options =
        method: 'GET'
        jar: true
        url: loginUrl

    # First request to get the cookie
    request options, (err, res, body) ->

        loginOptions =
            method: 'POST'
            form: form
            jar: true
            url: submitUrl
            headers:
                'Cookie': res.headers['set-cookie']
                'Referer': 'https://assure.ameli.fr/PortailAS/appmanager/PortailAS/assure?_nfpb=true&_pageLabel=as_login_page'
  
        # Second request to authenticate
        request loginOptions, (err, res, body) ->

            isNotLogedIn = body.indexOf('Connexion à mon compte') > -1

            if err or isNotLogedIn
                log.error "Authentification error"
                next 'bad credentials'
            else
                reimbursementOptions =
                    method: 'GET'
                    jar: true
                    url: reimbursementUrl

                # Last request to get the reimbursements
                request reimbursementOptions, (err, res, body) ->
                    if err then next err
                    else
                        data.html = body
                        next()


# Parse the fetched page to extract bill data.
parsePage = (requiredFields, healthBills, data, next) ->

    healthBills.fetched = []
    return next() if not data.html?

    $ = cheerio.load data.html

    $('#tabDerniersPaiements tbody tr').each -> 
        date = $($(this).find('td').get(0)).text()
        type = $($(this).find('td').get(1)).text()

        amount = $($(this).find('td').get(2)).text()
        amount = amount.replace ' Euros', ''
        amount = parseFloat amount

        # Get the details url
        detailsUrl = $($(this).find('td a').get(1)).attr('href')
        # Remove the unecessary port to avoid buggy request
        detailsUrl = detailsUrl.replace(':443', '') 

        bill =
            amount: amount
            type: type
            date: moment date, 'DD/MM/YYYY'
            vendor: 'Ameli'
            detailsUrl: detailsUrl 

        healthBills.fetched.push bill if bill.amount?

    # For each bill, get the pdf 
    async.each healthBills.fetched, (bill, callback) ->
        getPdf bill.detailsUrl, (err, pdfurl) ->
            bill.pdfurl = pdfurl
            callback err
    , (err) ->
        next err

# Retrieve pdf url
getPdf = (detailsUrl, callback) ->

    options =
        method: 'GET'
        jar: true
        url: detailsUrl

    # Request to get the pdf url
    request options, (err, res, body) ->
        if err? or res.statusCode isnt 200
            callback 'Pdf not found'
        else
            html = cheerio.load body
            pdfUrl = "https://assure.ameli.fr"
            pdfUrl += html('.r_lien_pdf').attr('href')
            #Remove all the dirty escape characters...
            pdfUrl = pdfUrl.replace(/(?:\r\n|\r|\n|\t)/g, '');
            callback null, pdfUrl