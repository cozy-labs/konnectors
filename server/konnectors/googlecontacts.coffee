cozydb = require 'cozydb'

https = require 'https'

requestJson = require 'request-json'

Contact = require '../models/contact'
CompareContacts = require '../lib/compare_contacts'

GoogleToken = require '../lib/google_access_token'
im = require('imagemagick-stream')
url = require 'url'


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
    description: "Synchronise google contacts with cozy through google's API. Experimental - please backup your contacts, from your cozy and your google account."
    vendorLink: "https://www.google.com/contacts/"

    customView: """
    <p>First step: connect to your Google account and authorize your Cozy to access to it. Google will provide you with a complex string. Once you get it copy it in your clipboard:</p>
    <button id="connect-google" title="Connect your Google account" class="btn"
       onclick="window.open('#{GoogleToken.getAuthUrl()}', 'Google OAuth', 'toolbars=0,width=700,height=600,left=200,top=200,scrollbars=1,resizable=1'); return false;"
       >Connect your Google account</button>
    <p>Then, copy and paste the code from the popup in the auth_code field. The Account name, Access token and Refresh token will be automatically filled in.</p>
    """
    fields:
        authCode: "text"
        accountName: "text"
        accessToken: "text"
        refreshToken: "text"

    models:
        contact: Contact

    init: (callback) ->
        callback()

    fetch: (requiredFields, callback) ->

        log.info "Import started"
        fetcher.new()
            .use(updateToken)
            .use(fetchAccountName)
            .use(saveTokensInKonnector)
            .use(fetchGoogleChanges)
            .use(prepareCozyContacts)
            .use(updateCozyContacts)
            .use(fetchAllGoogleContacts)
            .use(prepareCozyContacts)
            .use(updateGoogleContacts)

            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"
                callback()



updateToken = (requiredFields, entries, data, callback) ->

    if requiredFields.refreshToken? and requiredFields.authCode is 'connected'
        GoogleToken.refreshToken requiredFields.refreshToken, (err, tokens) ->
            return callback err if err
            requiredFields.accessToken = tokens.access_token

            callback()

    else
        GoogleToken.generateRequestToken requiredFields.authCode, (err, tokens) ->
            return callback err if err

            requiredFields.accessToken = tokens.access_token
            requiredFields.refreshToken = tokens.refresh_token
            requiredFields.authCode = 'connected'

            callback()


fetchAccountName = (requiredFields, entries, data, callback) ->
    if requiredFields.accountName? and
       requiredFields.accountName.indexOf('@') isnt -1
        return callback()

    request
        method: 'GET'
        uri: "https://www.googleapis.com/oauth2/v2/userinfo"
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
    , (err, res, body) ->
        return callback err if err
        if body.error
            log.info "Error while fetching account name : "
            log.info body
            return callback body

        requiredFields.accountName = body.email

        callback()

saveTokensInKonnector = (requiredFields, entries, data, callback) ->
    Konnector = require '../models/konnector'
    Konnector.all (err, konnectors) ->
        return callback err if err
        konnector = konnectors.filter((k) -> k.slug is'googlecontacts')[0]

        konnector.fieldValues['accountName'] = requiredFields.accountName
        konnector.fieldValues['accessToken'] = requiredFields.accessToken
        konnector.fieldValues['refreshToken'] = requiredFields.refreshToken
        konnector.fieldValues['authCode'] = requiredFields.authCode

        konnector.save callback


fetchGoogleChanges = (requiredFields, entries, data, callback) ->
    uri = "https://www.google.com/m8/feeds/contacts/#{requiredFields.accountName}/full/?alt=json&showdeleted=true&max-results=10000"

    if requiredFields.lastImport?
        # TODO: should use a 'lastSuccessfullImport' date, to avoid ellipsis
        # in changes.
        uri += "&updated-min=#{requiredFields.lastImport.toISOString()}"

    request
        method: 'GET'
        uri: uri
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
    , (err, res, body) ->
        return callback err if err
        if body.error
            log.info "Error while fetching google changes : "
            log.info body
            return callback body

        entries.googleChanges = body.feed?.entry or []

        callback()


updateCozyContacts = (requiredFields, entries, data, callback) ->
    async.eachSeries entries.googleChanges, (gEntry, cb) ->
        if gEntry.gd$deleted?
            removeFromCozyContact gEntry, entries.ofAccountByIds
            , requiredFields.accountName, cb
        else
            updateCozyContact gEntry, entries.cozyContacts, entries.ofAccountByIds
            , requiredFields, cb
    , callback

removeFromCozyContact = (gEntry, ofAccountByIds, accountName, callback) ->

    # fromGoogle = Contact.fromGoogleContact gEntry, accountName
    contact = ofAccountByIds[Contact.extractGoogleId(gEntry)]
    if contact?
        log.info "Unlink #{contact?.fn} from this account"
        contact.deleteAccount { type: ACCOUNT_TYPE, name: accountName }
        contact.save callback
    else
        log.info "Contact already unlinked from this account."
        callback()

updateCozyContact = (gEntry,  cozyContacts, ofAccountByIds, requiredFields, callback) ->
    accountName = requiredFields.accountName
    fromGoogle = new Contact Contact.fromGoogleContact gEntry, accountName
    accountG = fromGoogle.accounts[0]

    updateContact = (fromCozy, fromGoogle) ->
        CompareContacts.mergeContacts fromCozy, fromGoogle
        fromCozy.setAccount fromGoogle.accounts[0]
        fromCozy.save (err, contact) ->
            return callback err if err
            addContactPictureInCozy requiredFields, contact, gEntry, callback


    # already in cozy ?
    if accountG.id of ofAccountByIds
        fromCozy = ofAccountByIds[accountG.id]
        accountC = fromCozy.getAccount ACCOUNT_TYPE, accountName
        if accountC.lastUpdate < accountG.lastUpdate and
           fromGoogle.intrinsicRev() isnt fromCozy.intrinsicRev()
            log.info "Update #{fromCozy?.fn} from google"
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
            log.info "Link #{fromCozy?.fn} to google account"
            updateContact fromCozy, fromGoogle

        else # create
            log.info "Create #{fromGoogle?.fn} contact"

            fromGoogle.revision = new Date().toISOString()
            Contact.create fromGoogle, (err, contact) ->
                return callback err if err
                # TODO: reactivate this, needs upload to google to ;
                # check for speed
                # addContactPictureInCozy requiredFields, contact, gEntry, callback
                callback()




PICTUREREL = "http://schemas.google.com/contacts/2008/rel#photo"
addContactPictureInCozy = (requiredFields, cozyContact, gContact, done) ->
    pictureLink = gContact.link.filter (link) -> link.rel is PICTUREREL
    pictureUrl = pictureLink[0]?.href

    return done null unless pictureUrl

    opts = url.parse(pictureUrl)
    opts.headers =
        'Authorization': 'Bearer ' + requiredFields.accessToken
        'GData-Version': '3.0'
    https.get opts, (stream)->
        stream.on 'error', done
        unless stream.statusCode is 200
            log.warn "error fetching #{pictureUrl}", stream.statusCode
            return done null
        thumbStream = stream.pipe im().resize('300x300^').crop('300x300')
        thumbStream.on 'error', done
        thumbStream.path = 'useless'
        type = stream.headers['content-type']
        opts = {name: 'picture', type: type}
        cozyContact.attachFile thumbStream, opts, (err)->
            if err
                log.error "picture #{err}"
            else
                log.debug "picture ok"
            done err


fetchAllGoogleContacts = (requiredFields, entries, data, callback) ->
    uri = "https://www.google.com/m8/feeds/contacts/#{requiredFields.accountName}/full/?alt=json&max-results=10000"
    request
        method: 'GET'
        uri: uri
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
    , (err, res, body) ->
        return callback err if err
        if body.error?
            return callback new Error body.error

        entries.googleContacts = body.feed?.entry or []
        entries.googleContactsById = {}
        for gEntry in entries.googleContacts
            entries.googleContactsById[Contact.extractGoogleId(gEntry)] = gEntry

        callback()

prepareCozyContacts = (requiredFields, entries, data, callback) ->
    Contact.all (err, contacts) ->
        return callback err if err
        entries.cozyContacts = contacts
        # Create a set
        entries.ofAccount = []
        entries.ofAccountByIds = {}
        for contact in contacts
            account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName
            if account?
                entries.ofAccountByIds[account.id] = contact
                entries.ofAccount.push contact

        callback()

updateGoogleContacts = (requiredFields, entries, data, callback) ->

    googleContactsById = entries.googleContactsById

    async.eachSeries entries.ofAccount, (contact, cb) ->
        account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName
        gEntry = googleContactsById[account.id]
        delete googleContactsById[account.id] # Mark as shown

        if account.lastUpdate < contact.revision
            updateGoogleContact requiredFields, contact, gEntry, cb

        else
            cb()
    , (err) ->
        # Remaining contacts in googleContactsById should be deleted in google.
        toDelete = Object.keys googleContactsById
        return callback() if toDelete.length is 0
        log.info "delete #{toDelete.length} contacts in google"
        async.eachSeries toDelete, (gId, cb) ->
            deleteInGoogle requiredFields, gId, cb
        , callback


updateGoogleContact = (requiredFields, contact, gEntry, callback) ->
    account = contact.getAccount ACCOUNT_TYPE, requiredFields.accountName

    fromGoogle = new Contact Contact.fromGoogleContact gEntry
    if fromGoogle.intrinsicRev() isnt contact.intrinsicRev()
        log.info "update #{contact?.fn} in google"
        updated = contact.toGoogleContact gEntry
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
                log.warn 'Error while uploading contact to google'
                log.warn body

            callback() # continue with next contact on error.

            # else # update picture.
            #     putPicture2Google requiredFields, contact, gEntry, callback

    else
        callback()

# TODO : doesn't work yet ...
putPicture2Google = (requiredFields, contact, gEntry, callback) ->
    # Check if picture ...
    unless contact._attachments?.picture?
        return callback()

    # Get picture as bytes.
    stream = contact.getFile 'picture', (err) ->

        return callback err if err

    # request
    #     method: 'PUT'
    #     uri: "https://www.google.com/m8/feeds/photos/media/#{requiredFields.accountName}/#{Contact.extractGoogleId(gEntry)}"
    #     body: stream
    #     headers:
    #         'Authorization': 'Bearer ' + requiredFields.accessToken
    #         'GData-Version': '3.0'
    # , callback

    options =
        method: 'PUT'
        host: 'www.google.com',
        port: 443,
        path: "/m8/feeds/photos/media/#{requiredFields.accountName}/#{Contact.extractGoogleId(gEntry)}"
        # uri: "https://www.google.com/m8/feeds/photos/media/#{requiredFields.accountName}/#{Contact.extractGoogleId(gEntry)}"
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'

    req = https.request options, (res) ->
        res.on 'error', callback
        res.on 'data', (chunk) -> callback()

    stream.pipe req


deleteInGoogle = (requiredFields, gId, callback) ->
    request
        method: 'DELETE'
        uri: "https://www.google.com/m8/feeds/contacts/#{requiredFields.accountName}/full/#{gId}/"
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
            'If-Match': '*'
    , (err, res, body) ->
        callback err
