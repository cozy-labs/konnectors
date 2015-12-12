request = require 'request'
https = require 'https'
url = require 'url'
async = require 'async'
cheerio = require 'cheerio'
log = require('printit')
    prefix: "Linkedin"
    date: true

fetcher = require '../lib/fetcher'
Contact = require '../models/contact'
Tag = require '../models/tag'
ContactHelper = require '../lib/contact_helper'
CompareContacts = require '../lib/compare_contacts'

ACCOUNT_TYPE = 'com.linkedin'


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

                log.info "Import finished"
                callback()


# Load landing page to retrieve the csrf token needed in login request.
# More info on csrf -> https://en.wikipedia.org/wiki/Cross-site_request_forgery
#
# The html parsing is done with cheerio, a "jquery like" that can be run on
# the server side.
retrieveTokens = (requiredFields, entries, data, next) ->
    log.info 'Retrieve Tokens'
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
            log.info 'CSRF Token retrieved successfully'
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
    log.info 'Retrieve list contact'

    contactsUrl = "https://www.linkedin.com/contacts/api/contacts/"
    contactsUrl += "?start=0&count=10000&fields=id"
    opts =
        url: contactsUrl
        jar: true
        json: true

    log.info 'Retrieve contact list...'
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
        entries.ofAccountByIds = {}
        for contact in contacts
            entries.cozyContactsByFn[contact.fn] = contact
            account = contact.getAccount ACCOUNT_TYPE, entries.accountName
            entries.ofAccountByIds[account.id] = contact if account?

        log.info 'Cozy contacts contacts loaded.'
        next()


# Create or retrieve a specific to Linkedin, then
# make a request for each contact retrieved in the previous request
# (retrieveListContact) with all data needed.
#
# In order to reduce the waiting betwen each request an async queue
# is create. It process the 10 first contacts. (see Async lib)
saveContacts = (requiredFields, entries, data, next) ->

    processRetrievingContactData = (contactId, done) ->
        contacts = """https://www.linkedin.com/contacts/api/contacts/\
        #{contactId}/?fields=name,first_name,last_name,\
        emails_extended,phone_numbers,sites,addresses,\
        company,title,geo_location,profiles,twitter,tag,\
        secure_profile_image_url"""

        opts =
            url: contacts
            jar: true
            json: true

        request.get opts, (err, res, body) ->
            return done err if err
            if body.status? and body.status is 'error'
                return done new Error(body.status_details)

            datapoints = []

            # Fill datapoints
            data = body.contact_data
            datapoints = datapoints.concat getPhoneNumber(data)
            datapoints = datapoints.concat getEmails(data)
            datapoints = datapoints.concat getUrls(data)
            datapoints = datapoints.concat getAddresses(data)

            # Contact data composition
            finalContact = new Contact
                n: "#{data.last_name};#{data.first_name}"
                fn: data.name
                title: data.title || undefined
                org: data.company?.name || undefined
                title: data.title || undefined
                tags: ['linkedin']
                datapoints: datapoints || undefined

            finalContact.imageUrl = data.secure_profile_image_url || undefined
            ContactHelper.setAccount finalContact,
                type: ACCOUNT_TYPE
                name: entries.accountName
                id: data.id

            done null, finalContact


    # Create the queue
    queue = async.queue processRetrievingContactData, 10

    # Is executed once all data have been proceed
    queue.drain = ->
        log.info 'All data retrieved'
        next()

    Tag.getOrCreate { name: 'linkedin', color: '#1B86BC'}, (err, tag) ->
        if err
            entries.tag = null
        else
            entries.tag = tag

        # Add all contact Id to the queue
        entries.listContacts.forEach (contact) ->
            queue.push contact.id, (err, finalContact) ->
                log.error err if err
                saveContact finalContact, entries


# Extract numbers from given linkedin data structure.
getPhoneNumber = (data) ->
    listPhones = []

    data.phone_numbers?.forEach (number) ->
        listPhones.push
            name: 'tel'
            type: number.type.toLowerCase()
            value: number.number.replace(/ /g, '')
    listPhones


# Extract emails from given linkedin data structure.
getEmails = (data) ->
    listEmails = []

    data.emails_extended?.forEach (email) ->
        listEmails.push
            name: 'email'
            value: email.email
            type: 'internet'
            pref: email.primary is true ? true : undefined
    listEmails


# Extract urls from given linkedin data structure.
getUrls = (data) ->
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


# Currently there isn't an address parser so all the addresses are set in the
# locality fields. The Linkedin API allow us to define some fields precisely but
# that can lead to a duplicate so only the country is specify in the right fields
# and we should wait an address parser before use them
getAddresses = (data) ->
    listAddresses = []

    if data.location?
        segmentAddress = data.location.split(', ')
            .reverse()
        country = segmentAddress[0] || ''
        #region = segmentAddress[1] || ''
        #locality = segmentAddress[2] || ''

    data.addresses?.forEach (address) =>
        addressArray = ContactHelper.adrStringToArray address.raw
        addressArray[6] = country

        listAddresses.push
            name: 'adr'
            value: addressArray
            type: 'main'

    listAddresses


# Save and/or merge the imported contacts with the existing
saveContact  = (linkContact, entries) ->
    linkAccount = ContactHelper.getAccount linkContact, ACCOUNT_TYPE, entries.accountName


    urlImage = linkContact.imageUrl
    delete linkContact.imageUrl

    endSavePicture = (err, updatedContact) ->
        if err?
            log.error "An error occured while creating or updating the " + \
                      "contact."
            log.raw err
            done err


        if urlImage?
            opts = url.parse(urlImage)
            https.get opts, (stream) ->
                stream.on 'error', (err) -> log.error err

                updatedContact.attachFile stream, {name: 'picture'}, (err)->
                    if err
                        log.error "picture #{err}"
                    else
                        log.debug "picture ok"


    updateContact = (fromCozy, fromLinkedin) ->
        CompareContacts.mergeContacts fromCozy, fromLinkedin
        fromCozy.save endSavePicture


    if not linkAccount?
        throw new Error "Contact Account not created:"

    if entries.ofAccountByIds[linkAccount.id]?
        cozyContact = entries.ofAccountByIds[linkAccount.id]
        cozyAccount = cozyContact.getAccount ACCOUNT_TYPE, entries.accountName
        if ContactHelper.intrinsicRev(linkContact) isnt ContactHelper.intrinsicRev(cozyContact)
            log.info "Update #{cozyContact.fn} from LinkedIn"
            log.debug "Update #{linkContact.fn} from LinkedIn"
            updateContact cozyContact, linkContact

        else # Already uptodate, nothing to do.
            log.info "LinkedIn contact #{cozyContact.fn} already synced and uptodate"
            log.debug "LContact #{linkContact.n}already synced and uptodate"

    else
        if linkContact?
            if entries.cozyContactsByFn[linkContact.fn]?
                if cozyContact?
                    log.info "Link #{cozyContact.fn} to linkedin account"
                    updateContact cozyContact, linkContact
            else
                log.info "Create #{linkContact.fn} contact"
                Contact.create linkContact, endSavePicture

