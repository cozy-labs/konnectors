request = require 'request'
https = require 'https'
url = require 'url'
async = require 'async'
cheerio = require 'cheerio'
log = require('printit')
    prefix: "Linkedin"
    date: true

localization = require '../lib/localization_manager'
fetcher = require '../lib/fetcher'
Contact = require '../models/contact'
Tag = require '../models/tag'
ContactHelper = require '../lib/contact_helper'
CompareContacts = require '../lib/compare_contacts'

ACCOUNT_TYPE = 'com.linkedin'


## Helpers

linkedin =

    # Extract phone numbers from given linkedin data structure.
    getPhoneNumber: (data) ->
        listPhones = []

        data.phone_numbers?.forEach (number) ->
            listPhones.push
                name: 'tel'
                type: number.type.toLowerCase()
                value: number.number.replace(/ /g, '')
        listPhones


    # Extract emails from given linkedin data structure.
    getEmails: (data) ->
        listEmails = []

        data.emails_extended?.forEach (email) ->
            listEmails.push
                name: 'email'
                value: email.email
                type: 'internet'
                pref: email.primary is true ? true : undefined
        listEmails


    # Extract urls from given linkedin data structure.
    getUrls: (data) ->
        listUrls = []

        data.sites?.forEach (site) ->
            listUrls.push
                name: 'url'
                value: site.url
                type: site.name

        data.profiles?.forEach (profile) ->
            listUrls.push
                name: 'url'
                value: profile.url
                type: 'linkedin'

        data.twitter?.forEach (twitter) ->
            listUrls.push
                name: 'url'
                value: twitter.url
                type: 'twitter'

        listUrls


    # Currently there isn't a good address parser. So all the addresses are set
    # in the locality fields. The Linkedin API defines some fields
    # precisely but we can only handle properly the country. That's why this
    # function keeps only the country.
    # When we'll have a correct address parser we'll be able to include
    # region and locality.
    getAddresses: (data) ->
        listAddresses = []

        if data.location?
            segmentAddress = data.location.split(', ')
                .reverse()
            country = segmentAddress[0] or ''
            #region = segmentAddress[1] or ''
            #locality = segmentAddress[2] or ''

        data.addresses?.forEach (address) ->
            addressArray = ContactHelper.adrStringToArray address.raw
            addressArray[6] = country

            listAddresses.push
                name: 'adr'
                value: addressArray
                type: 'main'

        listAddresses



module.exports =

    name: "Linkedin"
    slug: "linkedin"
    description: "konnector description linkedin"

    fields:
        login: "text"
        password: "password"
    models:
        contact: Contact

    fetch: (requiredFields, callback) ->
        log.info 'Import started'
        fetcher.new()
            .use(retrieveTokens)
            .use(logIn)
            .use(retrieveContactList)
            .use(prepareCozyContacts)
            .use(saveContacts)
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                return callback err if err

                # Create the notification
                stats = entries.contactStats
                log.info """Import finished :
                #{stats.created} contacts created
                #{stats.updated} contacts updated"""
                if stats.created > 0
                    localizationKey = 'notification linkedin created'
                    options = smart_count: stats.created
                    notifContent = localization.t localizationKey, options
                if stats.updated > 0
                    localizationKey = 'notification linkedin updated'
                    options = smart_count: stats.updated
                    if notifContent?
                        notifContent += '\n'
                        notifContent += localization.t localizationKey, options
                    else
                        notifContent = localization.t localizationKey, options

                callback null, notifContent


# Load landing page to retrieve the csrf token needed in login request.
# More info on csrf -> https://en.wikipedia.org/wiki/Cross-site_request_forgery
#
# The html parsing is done with cheerio, a "jquery like" that can be run on
# the server side.
retrieveTokens = (requiredFields, entries, data, next) ->
    opts =
        url: 'https://linkedin.com'
        jar: true

    log.info 'Retrieving CSRF Token...'
    request.get opts, (err, res, body) ->
        return next err if err

        if body.status? and body.status is 'error'
            next new Error(body.status_details)
        else
            $ = cheerio.load body
            entries.csrfToken = $('#loginCsrfParam-login').val()
            entries.accountName = requiredFields.login
            log.info 'CSRF Token retrieved successfully.'
            next()


# Make the login request with the user inputs (login/password) and the CSRF
# token retrieved in the previous step.
logIn = (requiredFields, entries, data, next) ->
    opts =
        url: 'https://www.linkedin.com/uas/login-submit'
        jar: true
        form:
            session_key: requiredFields.login
            session_password: requiredFields.password
            loginCsrfParam: entries.csrfToken
            submit: "Sign+in"

    log.info 'Signing in...'
    request.post opts, (err, res, body) ->
        return next err if err

        if body is ""
            log.info 'Login succeeded!'
            next()
        else
            log.error 'Wrong login or password.'
            next new Error("Wrong login or password.")


# Retrieve a list of all Linkedin ID contacts available. The linkedin ID will
# be used to retrieve additional data about the contact.
retrieveContactList = (requiredFields, entries, data, next) ->

    contactsUrl = "https://www.linkedin.com/contacts/api/contacts/"
    contactsUrl += "?start=0&count=10000&fields=id"
    opts =
        url: contactsUrl
        jar: true
        json: true

    log.info 'Retrieving contact list...'
    request.get opts, (err, res, body) ->
        return next err if err

        if body.status? and body.status is 'error'
            next new Error body.status_details

        else
            entries.listContacts = body.contacts
            if not entries.listContacts?
                next new Error "Error retrieving contacts from request"
            else
                log.info 'Contact list retrieved.'
                next()


# Load all Cozy contacts, then perform several operations:
#
# * Keep only contacts linked to the current LinkedinAccount
# * Order them in a map where the LinkedIn account ID is the key
# * Order them in a map where the contact full name is the key.
#
# That way we will be able to check if the contact should be updated (because
# it already exists) or if it should be created.
#
prepareCozyContacts = (requiredFields, entries, data, next) ->

    log.info 'Load Cozy contacts...'
    Contact.all (err, contacts) ->
        return next err if err

        entries.cozyContactsByFn = {}
        entries.cozyContactsByAccountIds = {}
        for contact in contacts
            entries.cozyContactsByFn[contact.fn] = contact
            account = contact.getAccount ACCOUNT_TYPE, entries.accountName
            entries.cozyContactsByAccountIds[account.id] = contact if account?

        log.info 'Cozy contacts contacts loaded.'
        next()


# Retrieve additional data from Linkedin by making a request for each contact
# retrieved in previous step. Then it saves or updates the contact in the
# database.
saveContacts = (requiredFields, entries, data, next) ->
    # Initialise the counters
    entries.contactStats =
        created: 0
        updated: 0

    Tag.getOrCreate {name: 'linkedin', color: '#1B86BC'}, (err, tag) ->
        return next err if err

        entries.tag = tag

        processLinkedinContact = (contact, done) ->
            contactUrl = """https://www.linkedin.com/contacts/api/contacts/\
            #{contact.id}/?fields=name,first_name,last_name,\
            emails_extended,phone_numbers,sites,addresses,\
            company,title,geo_location,profiles,twitter,tag,\
            secure_profile_image_url"""

            opts =
                url: contactUrl
                jar: true
                json: true

            request.get opts, (err, res, body) ->
                return done err if err
                if body.status? and body.status is 'error'
                    return done new Error body.status_details

                datapoints = []

                # Fill datapoints
                data = body.contact_data
                datapoints = datapoints.concat linkedin.getPhoneNumber data
                datapoints = datapoints.concat linkedin.getEmails data
                datapoints = datapoints.concat linkedin.getUrls data
                datapoints = datapoints.concat linkedin.getAddresses data

                # Contact data composition
                newCozyContact = new Contact
                    n: "#{data.last_name};#{data.first_name}"
                    fn: data.name
                    org: data.company?.name
                    title: data.title
                    tags: ['linkedin']
                    datapoints: datapoints

                # TODO ensure it could not be set via the constructor.
                newCozyContact.imageUrl = data.secure_profile_image_url

                # Set information source for the given contact. It adds a flag
                # to say that the contact comes from Linkedin.
                ContactHelper.setAccount newCozyContact,
                    type: ACCOUNT_TYPE
                    name: entries.accountName
                    id: data.id

                saveContact newCozyContact, entries, done

        contacts = entries.listContacts
        async.eachSeries contacts, processLinkedinContact, (err) ->
            log.info 'All linkedin contacts were processed.'
            next()


# Saves contact information to the Data System. If the contact doesn't already
# exist, it is created. If the contact exists, it's updated with the Linkedin
# data.
saveContact  = (newContact, entries, callback) ->
    return callback() if not newContact?

    linkAccount = ContactHelper.getAccount(
        newContact, ACCOUNT_TYPE, entries.accountName
    )
    imageUrl = newContact.imageUrl
    delete newContact.imageUrl

    # Case where the contact already exists and where it was imported from
    # Linkedin.
    if entries.cozyContactsByAccountIds[linkAccount.id]?
        cozyContact = entries.cozyContactsByAccountIds[linkAccount.id]
        cozyAccount = cozyContact.getAccount ACCOUNT_TYPE, entries.accountName
        newRev = ContactHelper.intrinsicRev newContact
        previousRev = ContactHelper.intrinsicRev cozyContact

        if newRev isnt previousRev
            log.info "Update #{cozyContact.fn} with LinkedIn data."
            updateContact cozyContact, newContact, imageUrl,
            entries.contactStats, callback

        # Already up to date, nothing to do.
        else
            log.info "LinkedIn contact #{cozyContact.fn} is up to date."
            callback()

    # Case where the contact already exists but was not imported from Linkedin.
    else if entries.cozyContactsByFn[newContact.fn]?
        cozyContact = entries.cozyContactsByFn[newContact.fn]
        log.info "Link #{cozyContact.fn} to linkedin account and update data."
        updateContact cozyContact, newContact, imageUrl,
        entries.contactStats, callback

    # Case where the contact is not listed in the database.
    else
        log.info "Create new contact for #{newContact.fn}."
        Contact.create newContact, (err, newContact) ->
            return callback err if err
            entries.contactStats.created++
            savePicture newContact, imageUrl, callback


# Update contact with information coming from Linkedin, picture included.
updateContact = (fromCozy, fromLinkedin, imageUrl, contactStats, callback) ->
    CompareContacts.mergeContacts fromCozy, fromLinkedin
    newRev = ContactHelper.intrinsicRev fromCozy
    fromCozy.save (err, saved) ->
        return callback err if err
        newRev = ContactHelper.intrinsicRev saved
        contactStats.updated++
        savePicture fromCozy, imageUrl, callback


# Change contact picture with the one coming from Linkedin.
savePicture = (cozyContact, imageUrl, callback) ->
    if imageUrl?
        opts = url.parse imageUrl
        https.get opts, (stream) ->

            stream.on 'error', (err) ->
                log.error err

            cozyContact.attachFile stream, {name: 'picture'}, (err) ->
                if err
                    log.error """
                    Error occured while saving picture for #{cozyContact.fn}.
                    """
                    log.raw err
                else
                    log.info "Picture successfully saved for #{cozyContact.fn}."
                callback()
    else
        callback()

