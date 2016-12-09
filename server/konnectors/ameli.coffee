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
    "assure?_somtc=true"

    submitUrl = "https://assure.ameli.fr/PortailAS/appmanager/PortailAS/" + \
    "assure?_nfpb=true&_windowLabel=connexioncompte_2&connexioncompte_2_" + \
    "actionOverride=/portlets/connexioncompte/validationconnexioncompte&" + \
    "_pageLabel=as_login_page"

    reimbursementUrl = "https://assure.ameli.fr/PortailAS/appmanager/" + \
    "PortailAS/assure?_nfpb=true&_pageLabel=as_paiements_page"

    refererUrl = "https://assure.ameli.fr/PortailAS/appmanager/" + \
    "PortailAS/assure?_nfpb=true&_pageLabel=as_login_page"

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
        if err
            log.error err
            return next 'request error'
        else
            loginOptions =
                method: 'POST'
                form: form
                jar: true
                strictSSL: false
                url: submitUrl
                headers:
                    'Cookie': res.headers['set-cookie']
                    'Referer': refererUrl

            # Second request to authenticate
            request loginOptions, (err, res, body) ->
                if err
                    log.error err
                    next 'bad credentials'
                else if body.indexOf('Connexion à mon compte') > -1
                    log.error 'Authentication error'
                    next 'bad credentials'
                else
                    reimbursementOptions =
                        method: 'GET'
                        jar: true
                        strictSSL: false
                        headers:
                            'Cookie': res.headers['set-cookie']
                            'Referer': refererUrl
                        url: reimbursementUrl

                    # Last request to get the reimbursements page
                    request reimbursementOptions, (err, res, body) ->
                        if err
                            log.error err
                            return next 'request error'
                        else
                            data.html = body
                            next()


# Parse the fetched page to extract bill data.
parsePage = (requiredFields, healthBills, data, next) ->

    healthBills.fetched = []
    return next() if not data.html?

    $ = cheerio.load data.html

    # Get the start and end date to generate the bill's url
    startDate = $('#paiements_1dateDebut').attr('value')
    endDate = $('#paiements_1dateFin').attr('value')

    baseUrl = "https://assure.ameli.fr/PortailAS/paiements.do?actionEvt="

    billUrl = baseUrl + "afficherPaiementsComplementaires&DateDebut="
    billUrl += (startDate + "&DateFin=" + endDate)
    billUrl += "&Beneficiaire=tout_selectionner&afficherReleves=false&" + \
    "afficherIJ=false&afficherInva=false&afficherRentes=false&afficherRS=" + \
    "false&indexPaiement=&idNotif="

    billOptions =
        jar: true
        strictSSL: false
        url: billUrl

    request billOptions, (err, res, body) ->
        if err
            log.error err
            return next 'request error'
        else
            $ = cheerio.load body
            i = 0

            # Each bloc represents a month that includes 0 to n reimbursement
            $('.blocParMois').each ->

                $('[id^=lignePaiement' + i++ + ']').each ->

                    amount = $($(this).find('.col-montant').get(0)).text()
                    amount = amount.replace(' €', '').replace(',','.')
                    amount = parseFloat amount

                    month = $($(this).find('.col-date .mois').get(0)).text()
                    day = $($(this).find('.col-date .jour').get(0)).text()
                    date = day + ' ' + month
                    moment.locale 'fr'
                    date = moment(date, 'Do MMMM YYYY')

                    label = $($(this).find('.col-label').get(0)).text()

                    # Retrieve and extract the infos needed to generate the pdf
                    attrInfos = $(this).attr('onclick')
                    tokens = attrInfos.split("'")

                    idPaiement = tokens[1]
                    naturePaiement = tokens[3]
                    indexGroupe = tokens[5]
                    indexPaiement = tokens[7]

                    detailsUrl =  baseUrl + "chargerDetailPaiements&"
                    detailsUrl += "idPaiement=" + idPaiement  + "&"
                    detailsUrl += "naturePaiement=" + naturePaiement + "&"
                    detailsUrl += "indexGroupe=" + indexGroupe + "&"
                    detailsUrl += "indexPaiement=" + indexPaiement

                    lineId = indexGroupe + indexPaiement

                    bill =
                        amount: amount
                        type: 'health'
                        subtype: label
                        date: date
                        vendor: 'Ameli'
                        lineId: lineId
                        detailsUrl: detailsUrl

                    healthBills.fetched.push bill if bill.amount?

            async.each healthBills.fetched, getPdf, (err) ->
                next err


getPdf = (bill, callback) ->

    # Request the generated url to get the detailed pdf
    detailsOptions =
        jar: true
        strictSSL: false
        url: bill.detailsUrl

    request detailsOptions, (err, res, body) ->
        if err
            log.error err
            return callback 'request error'
        else
            $ = cheerio.load body

            pdfUrl = $('[id=liendowndecompte' + bill.lineId + ']').attr('href')
            if pdfUrl
                pdfUrl = "https://assure.ameli.fr" + pdfUrl
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
    bankIdentifier = requiredFields.bank_identifier
    identifier = bankIdentifier if bankIdentifier? and bankIdentifier isnt ""

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

    category: 'health'
    color:
        hex: '#0062AE'
        css: '#0062AE'

    fields:
        login:
            type: 'text'
        password:
            type: 'password'
        bank_identifier:
            type: 'text'
        folderPath:
            type: 'folder'
            advanced: true

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
