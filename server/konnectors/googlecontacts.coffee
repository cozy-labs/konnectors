cozydb = require 'cozydb'

https = require 'https'

requestJson = require 'request-json'

Contact = require '../models/contact'
CompareContacts = require '../lib/compare_contacts'
#
fs = require 'fs'
qs = require 'querystring'
# requestJson = require 'request-json'
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
    prefix: "Google Contacts"
    date: true

ACCOUNT_TYPE = 'com.google'

# Konnector

module.exports =

    name: "Google Contacts"
    slug: "googlecontacts"
    description: "Synchronise google contacts with cozy through google's API."
    vendorLink: "https://www.google.com/contacts/"

    # TODO
    fields:
        accessToken: "access_token"


    models:
        contact: Contact

    realtimeEvents:
        'contact.*': (event, msg) ->
            log.info "receive Realtime event !"
            log.info event
            log.info JSON.stringify event
            log.info msg

        # 'contact.delete': deleteInGoogle

    init: (callback) ->
        log.inf 'init google contacts'
        # listen to contact's events
        server = require '../server'
        log.info server
        callback

    fetch: (requiredFields, callback) ->

        log.info "Import started"
        fetcher.new()
            .use(updateToken)
            .use(listContacts)
            .use(updateCozyContacts)
            .use(updateGoogleContacts)

            # .use(parsePage)
            # .use(filterExisting log, InternetBill)
            # .use(saveDataAndFile log, InternetBill, 'bouygues', ['facture'])
            # .use(linkBankOperation
            #     log: log
            #     model: InternetBill
            #     identifier: 'bouyg'
            #     dateDelta: 20
            #     amountDelta: 0.1
            # )
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"

                # # TODO move this in a procedure.
                # notifContent = null
                # if entries?.filtered?.length > 0
                #     localizationKey = 'notification bouygues'
                #     options = smart_count: entries.filtered.length
                #     notifContent = localization.t localizationKey, options

                # callback null, notifContent
                callback()

updateToken = (requiredFields, entries, data, callback) ->
    # TODO : stub

    requiredFields.accountType = 'com.google'
    requiredFields.accountName = 'rogerdupondt@gmail.com'

    refreshToken = "1/-Jq_-Rx9qi6oq8ipd1zKIKc560SXxzFnq1Fp8LAGttBIgOrJDtdun6zK6XiATCKT"
    # client = requestJson.createClient 'https://www.googleapis.com'
    # client.headers['Content-Type'] = 'application/x-www-form-urlencoded'

    data =
        client_secret: "1gNUceDM59TjFAks58ftsniZ"
        client_id: """
260645850650-2oeufakc8ddbrn8p4o58emsl7u0r0c8s.apps.googleusercontent.com"""
        refresh_token: refreshToken
        grant_type: "refresh_token"

    request
        method: 'POST'
        form: data
        jar: true
        uri: "https://www.googleapis.com/oauth2/v3/token"
        headers: 'Content-Type': 'application/x-www-form-urlencoded'
    , (err, res, body) ->
        return callback err if err
        log.info "gotToken", body

        requiredFields.accessToken = JSON.parse(body).access_token
        callback()


listContacts = (requiredFields, entries, data, callback) ->
    # TODO : fetch only modified since contacts.

    log.info "hello"
    #accessToken = "ya29.vgHoqJW8NZ847R74u0MQtOt1B677L0voaQZ--HtSaBPLCnE881Nnvxc16DSIulB3oNmK"
        # requiredFields.accessToken

    opts =
        host: 'www.google.com'
        port: 443
        path: '/m8/feeds/contacts/default/full?alt=json&max-results=10000'
        method: 'GET'
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'

    req = https.request opts, (res) ->
        data = []

        res.on 'error', callback
        res.on 'data', (chunk) -> data.push chunk
        res.on 'end', ->
            if res.statusCode is 200
                try
                    result = JSON.parse data.join('')
                    entries.fetched = result.feed.entry
                    callback()
                catch err then callback err
            else
                callback new Error("Error #{res.statusCode}")


    req.on 'error', callback
    req.end()

    # TODO : Z pagination !





updateCozyContacts = (requiredFields, entries, data, callback) ->
    Contact.all (err, contacts) ->
        return callback err if err
        entries.cozyContacts = contacts
        # Create a set
        ofAccountByIds = {}
        for contact in contacts
            account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName
            if account?
                ofAccountByIds[account.id] = contact

        async.eachSeries entries.fetched, (gEntry, cb) ->
            updateCozyContact gEntry, contacts, ofAccountByIds
            , requiredFields.accountName, cb
        , callback


updateCozyContact = (gEntry,  cozyContacts, ofAccountByIds, accountName, callback) ->
    fromGoogle = new Contact Contact.fromGoogleContact gEntry, accountName
    accountG = fromGoogle.accounts[0]

    updateContact = (fromCozy, fromGoogle) ->
        CompareContacts.mergeContacts fromCozy, fromGoogle
        fromCozy.setAccount fromGoogle.accounts[0]
        fromCozy.save callback

    # already in cozy ?
    if accountG.id of ofAccountByIds
        fromCozy = ofAccountByIds[accountG.id]
        accountC = fromCozy.getAccount ACCOUNT_TYPE, accountName
        if accountC.lastUpdate < accountG.lastUpdate
            updateContact fromCozy, fromGoogle

        else # Already uptodate, nothing to do.
            callback()

    else # Add to cozy.
        # look for same, take the first one
        fromCozy = null
        for cozyContact in cozyContacts
            if CompareContacts.isSamePerson cozyContact, fromGoogle
                fromCozy = cozyContact
                break

        if fromCozy? and not fromCozy.getAccount(ACCOUNT_TYPE, accountName)?
            updateContact fromCozy, fromGoogle

        else # create
            fromGoogle.revision = new Date().toISOString()
            Contact.create fromGoogle, callback

updateGoogleContacts = (requiredFields, entries, data, callback) ->
    log.info "updateGoogleContacts"
    async.eachSeries entries.cozyContacts, (contact, cb) ->
        account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName

        if account.lastUpdate < contact.revision
        # if account.id is "8bd56970a2ad935"
        # if account.id is "35634daa896f7801"
            log.info "update: #{contact.fn}"
            updateGoogleContact requiredFields, contact, cb

        else
            cb()
    , callback


updateGoogleContact = (requiredFields, contact, callback) ->
    account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName

    request
        method: 'GET'
        uri: "https://www.google.com/m8/feeds/contacts/#{account.name}/full/#{account.id}/?alt=json"
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
    , (err, res, body) ->
        return callback err if err
        fromGoogle = new Contact Contact.fromGoogleContact body.entry
        if fromGoogle.intrinsicRev() isnt contact.intrinsicRev()
            log.info "need to update gContact"
            updated = contact.toGoogleContact body.entry

            log.info updated

            request
                method: 'PUT'
                uri: "https://www.google.com/m8/feeds/contacts/#{account.name}/full/#{account.id}/?alt=json"
                json: true
                body: entry: updated
                headers:
                    'Authorization': 'Bearer ' + requiredFields.accessToken
                    'GData-Version': '3.0'
                    'If-Match': '*'
            , (err, res, body) ->
                return callback err if err
                if body.error?
                    log.info 'Error while uploading contact to google', body
                log.info "updated done !"
                callback()
        else
            log.info "gContact uptodate"
            callback()




# Procedure to login to Bouygues website.
logIn = (requiredFields, bills, data, next) ->

    loginUrl = 'https://www.mon-compte.bouyguestelecom.fr/cas/login'
    billUrl = 'http://www.bouyguestelecom.fr/mon-compte/suivi-conso/factures'
    userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:36.0) ' + \
                'Gecko/20100101 Firefox/36.0'

    # First request to grab the login form
    loginOptions =
        uri: loginUrl
        jar: true
        method: 'GET'
        headers:
            'User-Agent': userAgent

    request loginOptions, (err, res, body) ->
        return next err if err

        # Extract hidden values
        $ = cheerio.load body
        lt = $('input[name="lt"]').val()
        execution = $('input[name="execution"]').val()

        # Second request to log in (post the form).
        form =
            "username": requiredFields.email
            "password": requiredFields.password
            "lt": lt
            "execution": execution
            "_eventId": 'submit'

        loginOptions =
            method: 'POST'
            form: form
            jar: true
            uri: loginUrl
            headers:
                'User-Agent': userAgent

        request loginOptions, (err, res, body) ->
            return next err if err

            # Third request to build the links of the bills
            options =
                method: 'GET'
                uri: billUrl
                jar: true
                headers:
                    'User-Agent': userAgent
            request options, (err, res, body) ->
                return next err if err
                data.html = body
                next()


# Procedure to extract bill data from the page.
parsePage = (requiredFields, bills, data, next) ->
    baseDlUrl = 'https://www.bouyguestelecom.fr/mon-compte/' + \
                'suiviconso/index/facturepdffixe'
    bills.fetched = []

    # Load page to make it browseable easily.
    $ = cheerio.load data.html

    # We browse the bills table by processing each line one by one.
    $('.historique tr').each ->

        # If we find download information, it's a row with bill information
        urlData = $(this).find('.voirMaFacture a').attr('onclick')
        if urlData?

            # We get directly from the first field.
            date =  $(this).find('.eccogrisc:first-child').html()

            # Amount is in a weird field that contains nested spans. We only
            # get the five first chars of the element text.
            amount =  $(this).find('td:nth-child(2) span').text().substring 0, 5
            amount = amount.replace '€', ','

            # Build download url from data contained in the javascript code run
            # when the link is clicked.
            dataArray = urlData.split ','
            params =
                id: dataArray[4].replace /[\/'\s]/g, ''
                date: dataArray[5].replace /[\/'\s]/g, ''
                type: dataArray[6].replace /[\/'\s]/g, ''
                no_reference:dataArray[7].replace /[\/)'\s]/g, ''
            url = "#{baseDlUrl}?#{qs.stringify params}"

            if params.type is 'Bbox'
                # Build bill object.
                bill =
                    date: moment date, 'DD/MM/YYYY'
                    amount: amount.replace ',', '.'
                    pdfurl: url
                bills.fetched.push bill
    next()
