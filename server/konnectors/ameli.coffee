cozydb = require 'cozydb'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'
async = require 'async'

File = require '../models/file'
Bill = require '../models/bill'
baseKonnector = require '../lib/base_konnector'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Ameli"
    date: true

checkLogin = (requiredFields, billInfos, data, next) ->
    if requiredFields.login.length > 13
        log.error "Login with #{requiredFields.login.length} digits : refused"
        next 'bad credentials'
    else next()

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
        strictSSL: false
        url: loginUrl


    # First request to get the cookie
    request options, (err, res, body) ->
        return next err if err?

        loginOptions =
            method: 'POST'
            form: form
            jar: true
            strictSSL: false
            url: submitUrl
            headers:
                'Cookie': res.headers['set-cookie']
                'Referer': 'https://assure.ameli.fr/PortailAS/appmanager/' + \
                           'PortailAS/assure?_nfpb=true&_pageLabel=' + \
                           'as_login_page'

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
                    strictSSL: false
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
        subtype = $($(this).find('td').get(1)).text()

        amount = $($(this).find('td').get(2)).text()
        amount = amount.replace(' euros', '').replace(',','.')
        amount = parseFloat amount

        # Get the details url
        detailsUrl = $($(this).find('td a').get(1)).attr('href')
        # Remove the unecessary port to avoid buggy request
        detailsUrl = detailsUrl.replace(':443', '')

        bill =
            amount: amount
            type: 'health'
            subtype: subtype
            date: moment date, 'DD/MM/YYYY'
            vendor: 'Ameli'
            detailsUrl: detailsUrl

        healthBills.fetched.push bill if bill.amount?

    # For each bill, get the pdf
    async.each healthBills.fetched, getPdf, (err) ->
        next err


# Retrieve pdf url
getPdf = (bill, callback) ->
    detailsUrl = bill.detailsUrl

    options =
        method: 'GET'
        jar: true
        strictSSL: false
        url: detailsUrl

    # Request to get the pdf url
    request options, (err, res, body) ->
        if err? or res.statusCode isnt 200
            callback new Error 'Pdf not found'
        else
            html = cheerio.load body
            pdfUrl = "https://assure.ameli.fr"
            pdfUrl += html('.r_lien_pdf').attr('href')
            # Remove all the dirty escape characters...
            pdfUrl = pdfUrl.replace(/(?:\r\n|\r|\n|\t)/g, '')
            bill.pdfurl = pdfUrl
            callback null


buildNotification = (requiredFields, healthBills, data, next) ->
    log.info "Import finished"
    notifContent = null
    if healthBills?.filtered?.length > 0
        localizationKey = 'notification ameli'
        options = smart_count: healthBills.filtered.length
        healthBills.notifContent = localization.t localizationKey, options

    next()

customLinkBankOperation = (requiredFields, healthBills, data, next) ->
    identifier = 'C.P.A.M.'
    if requiredFields.bank_identifier isnt ""
        identifier = requiredFields.bank_identifier

    linkBankOperation(
        log: log
        model:  Bill
        identifier: identifier
        dateDelta: 10
        amountDelta: 0.1
    )(requiredFields, healthBills, data, next)

fileOptions =
    vendor: 'ameli'
    dateFormat: 'YYYYMMDD'


module.exports = baseKonnector.createNew

    name: "Ameli"
    vendorLink: "http://www.ameli.fr/"

    fields:
        login: "text"
        password: "password"
        bank_identifier: "string"
        folderPath: "folder"

    models: [Bill]

    fetchOperations: [
        checkLogin,
        logIn,
        parsePage,
        filterExisting(log, Bill),
        saveDataAndFile(log, Bill, fileOptions, ['health', 'bill']),
        customLinkBankOperation,
        buildNotification
    ]

