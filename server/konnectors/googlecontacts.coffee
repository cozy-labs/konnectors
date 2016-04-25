request = require 'request'
async = require 'async'
fetcher = require '../lib/fetcher'
extend = require('util')._extend

Contact = require '../models/contact'
Tag = require '../models/tag'

CompareContacts = require '../lib/compare_contacts'
ContactHelper = require '../lib/contact_helper'
GoogleContactHelper = require '../lib/google_contact_helper'

GoogleToken = require '../lib/google_access_token'


localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Google Contacts"
    date: true


ACCOUNT_TYPE = 'com.google'

# Konnector

module.exports =

    name: "Google Contacts"
    slug: "googlecontacts"
    description: 'konnector description googlecontacts'
    vendorLink: "https://www.google.com/contacts/"

    customView: """
    <h6><%t konnector customview googlecontacts 4 %></h6>
    <p><%t konnector customview googlecontacts 1 %></p>
    <button id="connect-google"
    title="<%t konnector customview googlecontacts 2 %>" class="btn"
       onclick="window.open('#{GoogleToken.getAuthUrl()}',
       'Google OAuth',
       'toolbars=0,
       width=700,height=600,left=200,top=200,scrollbars=1,resizable=1');
       var input = $('#googlecontacts-authCode-input');
       input.parents('.field').toggleClass('hidden');
       input.attr('type', 'text');
       input.val('');
       $('#googlecontacts-accountName-input').text('--');
       return false;"
       ><%t konnector customview googlecontacts 2 %></button>
    <p><%t konnector customview googlecontacts 3 %></p>
    """
    fields:
        authCode: "hidden"
        accountName: "label"
        accessToken: "hidden"
        refreshToken: "hidden"

    models:
        contact: Contact

    init: (callback) ->
        callback()

# Sync status data
# Each cozy contact hold a account field, which is a list of each external
# account this contact is synchronized with. Each account object as
# following fields :
# { type: 'com.google', name: 'jean.dupont@gmail.com',  }
# Sync strategy:
# 1. Fetch changes from google  since last successfull sync, including deleted
# 2. Get contacts from DataSystem, and prepare convenient data structure for
# nexts algorythm.
# 3. Update Contact with it:
#    - delete flagged contact
#    - update contact if already synced
#    - else, find a same contact in cozy and merge them
#    - else create a brand new cozy contact
# 4. Fetch all google contacts
# 5. Get contacts from DS another time
# 6. Update contact in google:
#       - iterate on each cozy contact linked to this google account
#       - update them in google on changes
#       - remove from google contact absent in cozy.

    fetch: (requiredFields, callback) ->
        log.info "Import started"
        fetcher.new()
            .use(updateToken)
            .use(fetchAccountName)
            .use(saveTokensInKonnector)
            .use(fetchGoogleChanges)
            .use(prepareCozyContacts)
            .use(updateCozyContacts)
            #.use(fetchAllGoogleContacts)
            #.use(prepareCozyContacts)
            #.use(updateGoogleContacts)

            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err
                log.info "Import finished"
                callback()


# Obtain a valid access_token : with auth_code on first launch,
# else with the refresh_token.
module.exports.updateToken = updateToken = (requiredFields, entries, data,
callback) ->
    log.debug 'updateToken'

    if requiredFields.refreshToken? and requiredFields.authCode is 'connected'
        GoogleToken.refreshToken requiredFields.refreshToken, (err, tokens) ->
            return callback err if err
            requiredFields.accessToken = tokens.access_token

            callback()

    else
        GoogleToken.generateRequestToken(
            requiredFields.authCode, (err, tokens) ->
                return callback err if err

                requiredFields.accessToken = tokens.access_token
                requiredFields.refreshToken = tokens.refresh_token
                requiredFields.authCode = 'connected'
                requiredFields.accountName = null
                requiredFields.lastSuccess = null # Reset

                callback()
        )


# Fetch account name (email address of this google account) on first launch.
fetchAccountName = (requiredFields, entries, data, callback) ->
    log.debug 'fetchAccountName'

    if requiredFields.accountName? and
    requiredFields.accountName.indexOf('@') isnt -1
        return callback()

    GoogleContactHelper.fetchAccountName requiredFields.accessToken
    , (err, accountName) ->
        return callback err if err
        requiredFields.accountName = accountName
        callback()


# Save konnector's fieldValues during fetch process.
saveTokensInKonnector = (requiredFields, entries, data, callback) ->
    log.debug 'saveTokensInKonnector'

    Konnector = require '../models/konnector'
    Konnector.all (err, konnectors) ->
        return callback err if err
        konnector = konnectors.filter((k) -> k.slug is'googlecontacts')[0]

        accounts = [
            accountName: requiredFields.accountName
            accessToken: requiredFields.accessToken
            refreshToken: requiredFields.refreshToken
            authCode: requiredFields.authCode
        ]

        konnector.updateAttributes {accounts}, callback


# Fetch changes in google contacts since last successfull fetch.
fetchGoogleChanges = (requiredFields, entries, data, callback) ->
    log.debug 'fetchGoogleChanges'

    uri = "https://www.google.com"
    uri += "/m8/feeds/contacts/#{requiredFields.accountName}/full/"
    uri += "?alt=json&showdeleted=true&max-results=10000"

    if requiredFields.lastSuccess?
        uri += "&updated-min=#{requiredFields.lastSuccess.toISOString()}"

    log.debug "fetch #{uri}"
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


# Update contacts in cozy to apply google changes.
#    - delete flagged contact
#    - update contact if already synced
#    - else, find a same contact in cozy and merge them
#    - else create a brand new cozy contact
updateCozyContacts = (requiredFields, entries, data, callback) ->
    log.debug 'updateCozyContacts'

    async.mapSeries entries.googleChanges
    , (gEntry, cb) ->
        if gEntry.gd$deleted?
            removeFromCozyContact gEntry, entries.ofAccountByIds
            , requiredFields.accountName, cb
        else
            GoogleContactHelper.updateCozyContact gEntry, entries
            , requiredFields.accountName, requiredFields.accessToken, cb
    , (err, updated) ->
        return callback err if err
        if updated.some((contact) -> contact?)
            # Contact created or linked, with google tag, getOrCreate it
            Tag.getOrCreate { name: 'google', color: '#4285F4'}, callback
        else
            callback()


# Unlink cozy contact from this account. Just removes account object from
# the contact's account field.
removeFromCozyContact = (gEntry, ofAccountByIds, accountName, callback) ->
    id = GoogleContactHelper.extractGoogleId gEntry
    contact = ofAccountByIds[id]
    if contact?
        log.debug "Unlink #{id} #{contact?.fn} from this account"
        log.info "Unlink #{id} from this account"
        accounts = contact.accounts.filter (account) ->
            not (account.type is ACCOUNT_TYPE and account.name is accountName)
        tags = contact.tags.filter (tag) -> tag isnt "google"
        contact.updateAttributes
            tags: tags
            accounts: accounts
        , callback
    else
        log.info "Contact #{id} already unlinked from this account."
        callback()


# Fetch all contact of this google account.
fetchAllGoogleContacts = (requiredFields, entries, data, callback) ->
    log.debug 'fetchAllGoogleContacts'

    uri = "https://www.google.com"
    uri += "/m8/feeds/contacts/#{requiredFields.accountName}/full/"
    uri += "?alt=json&max-results=10000"
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
            id = GoogleContactHelper.extractGoogleId gEntry
            entries.googleContactsById[id] = gEntry

        callback()


# Get cozy's contact, and prepare andy data structures for nexts procedures.
prepareCozyContacts = (requiredFields, entries, data, callback) ->
    log.debug 'prepareCozyContacts'
    Contact.all (err, contacts) ->
        return callback err if err
        entries.cozyContacts = contacts
        # Create a set
        entries.ofAccount = []
        entries.ofAccountByIds = {}
        for contact in contacts
            account = contact.getAccount(
                ACCOUNT_TYPE, requiredFields.accountName
            )
            if account?
                entries.ofAccountByIds[account.id] = contact
                entries.ofAccount.push contact

        callback()


# Apply changes in cozy to google contacts
updateGoogleContacts = (requiredFields, entries, data, callback) ->
    log.debug 'updateGoogleContacts'

    googleContactsById = extend {}, entries.googleContactsById

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
    fromGoogle = new Contact GoogleContactHelper.fromGoogleContact gEntry
    if ContactHelper.intrinsicRev(fromGoogle) isnt
    ContactHelper.intrinsicRev(contact)
        log.debug ContactHelper.intrinsicRev(contact)
        log.debug ContactHelper.intrinsicRev(fromGoogle)

        log.debug "update #{contact?.fn} in google"
        log.info "update #{contact?._id} in google"
        updated = GoogleContactHelper.toGoogleContact contact, gEntry

        uri = "https://www.google.com"
        uri += "/m8/feeds/contacts/#{account.name}/full/#{account.id}/"
        uri += "?alt=json"

        request
            method: 'PUT'
            uri: uri
            json: true
            body: entry: updated
            headers:
                'Authorization': 'Bearer ' + requiredFields.accessToken
                'GData-Version': '3.0'
                'If-Match': '*'
        , (err, res, body) ->
            return callback err if err
            log.debug  body
            if body.error?
                log.warn 'Error while uploading contact to google'
                log.warn body

                callback() # continue with next contact on error.

            else # update picture.
                GoogleContactHelper.putPicture2Google(
                    requiredFields.accessToken, account, contact, callback
                )

    else
        callback()


deleteInGoogle = (requiredFields, gId, callback) ->
    uri = "https://www.google.com"
    uri += "/m8/feeds/contacts/#{requiredFields.accountName}/full/#{gId}/"

    request
        method: 'DELETE'
        uri: uri
        json: true
        headers:
            'Authorization': 'Bearer ' + requiredFields.accessToken
            'GData-Version': '3.0'
            'If-Match': '*'

    , (err, res, body) ->
        callback err

