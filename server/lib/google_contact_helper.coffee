https = require 'https'
im = require 'imagemagick-stream'
url = require 'url'
request = require 'request-json'


ContactHelper = require './contact_helper'
CompareContacts = require './compare_contacts'
module.exports = GCH = {}

log = require('printit')
    date: true

GCH.ACCOUNT_TYPE = 'com.google'


GCH.extractGoogleId = (gEntry) ->
    uri = gEntry.id?.$t
    if uri?
        parts = uri.split '/'
        return parts[parts.length - 1]

# Parse a google contact to a cozy contact.
GCH.fromGoogleContact = (gContact, accountName)->
    return unless gContact?

    # Fillup contact's direct fields.
    contact =
        docType: 'contact'
        fn: gContact.gd$name?.gd$fullName?.$t

        org: gContact?.gd$organization?[0]?.gd$orgName?.$t
        title: gContact?.gd$organization?[0]?.gd$orgTitle?.$t
        # department
        bday: gContact.gContact$birthday?.when
        nickname: gContact.gContact$nickname?.$t
        note: gContact.content?.$t
        accounts : [
            type: 'com.google'
            name: accountName
            id: GCH.extractGoogleId gContact
            lastUpdate: gContact.updated?.$t
        ]

    nameComponent = (field) ->
        part = gContact.gd$name?[field]?.$t or ''
        return part.replace /;/g, ' '

    contact.n = "#{nameComponent('gd$familyName')};#{nameComponent('gd$givenName')};#{nameComponent('gd$additionalName')};#{nameComponent('gd$namePrefix')};#{nameComponent('gd$nameSuffix')}"

    # Extract the type, or fall back on label, or other.
    getTypeFragment = (component) ->
        return component.rel?.split('#')[1] or component.label or 'other'

    # Select type between rel, label field or default to 'other' value.
    getTypePlain = (component) ->
        return component.rel or component.label or 'other'

    # Datapoints
    contact.datapoints = []
    for email in gContact.gd$email or []
        contact.datapoints.push
            name: "email"
            pref: email.primary or false
            value: email.address
            type: getTypeFragment email

    for phone in gContact.gd$phoneNumber or []
        # TODO : phone.uri is cleaner (country prefix, grouped numbers, ...),
        # but is trickier to sync.
        #value = phone.uri?.replace('tel:', '').replace(/-/g, ' ')
        contact.datapoints.push
            name: "tel"
            pref: phone.primary or false
            value: phone.$t
            type: getTypeFragment phone

    for iM in gContact.gd$im or []
        contact.datapoints.push
            name: "chat"
            value: iM.address
            type: iM.protocol?.split('#')[1] or 'other'

    for adr in gContact.gd$structuredPostalAddress or []
        contact.datapoints.push
            name: "adr"
            value: ["", "", adr.gd$street?.$t or "",
                adr.gd$city?.$t or ""
                adr.gd$region?.$t or ""
                adr.gd$postcode?.$t or ""
                adr.gd$country?.$t or ""
            ]
            type: getTypeFragment adr

    websites = gContact.gContact$website or []
    for web in websites
        contact.datapoints.push
            name: "url"
            value: web.href
            type: getTypePlain web

    for rel in gContact.gContact$relation or []
        contact.datapoints.push
            name: "relation"
            value: rel.$t
            type: getTypePlain rel

    for ev in gContact.gContact$event or []
        contact.datapoints.push
            name: "about"
            value: ev.gd$when?.startTime
            type: getTypePlain ev

    contact.tags = ['google']

    return contact


GCH.toGoogleContact = (contact, gEntry) ->
    _extend = (a, b) ->
        for k, v of b
            if v?
                a[k] = v
        return a

    gContact = updated: $t: contact.revision

    [lastName, firstName, middleName, prefix, suffix] = contact.n.split ';'
    name = {}
    name.gd$fullName = $t: contact.fn
    name.gd$familyName = $t: lastName if lastName? and lastName isnt ''
    name.gd$givenName = $t: firstName if firstName? and firstName isnt ''
    name.gd$additionalName = $t: middleName if middleName? and middleName isnt ''
    name.gd$namePrefix = $t: prefix if prefix? and prefix isnt ''
    name.gd$nameSuffix = $t: suffix if suffix? and suffix isnt ''
    gContact.gd$name = name

    gContact.gContact$birthday = when: contact.bday if contact.bday?
    gContact.gContact$nickname = $t: contact.nickname if contact.nickname?
    # Force deletion with empty string if no note.
    gContact.content = $t: contact.note or ''

    if contact.org? or contact.title?
        org = rel: "http://schemas.google.com/g/2005#other"
        org.gd$orgName = $t: contact.org if contact.org?
        org.gd$orgTitle = $t: contact.title if contact.title?
        gContact.gd$organization = [ org ]

    setTypeFragment = (dp, field) ->
        if dp.type in ['fax', 'home', 'home_fax', 'mobile', 'other',
            'pager', 'work', 'work_fax']
            field.rel = "http://schemas.google.com/g/2005##{dp.type}"
        else
            field.label = dp.type

        return field

    addField = (gField, field) ->
        unless gContact[gField]
            gContact[gField] = []
        gContact[gField].push field

    if contact.url and
       # Avoid duplication of url in datapoints.
       not contact.datapoints.some((dp) ->
            dp.type is "url" and dp.value is contact.url)

        addField 'gContact$website',
            href: contact.url
            rel: 'other'

    for dp in contact.datapoints when dp.value? and dp.value isnt ''
        name = dp.name.toUpperCase()
        switch name
            when 'TEL'
                if dp.value? and dp.value isnt ''
                    addField 'gd$phoneNumber', setTypeFragment dp, $t: dp.value

            when 'EMAIL'
                field = setTypeFragment dp, address: dp.value
                field.primary = "true" if field.pref

                addField 'gd$email', field

            when 'ADR'
                if dp.value instanceof Array
                    field = setTypeFragment dp, {}
                    field.gd$formattedAddress = ContactHelper.adrArrayToString dp.value

                    street = ContactHelper.adrCompleteStreet dp.value
                    if street isnt ''
                        field.gd$street = $t: street

                    field.gd$city = $t: dp.value[3] if dp.value[3]
                    field.gd$region = $t: dp.value[4] if dp.value[4]
                    field.gd$postcode = $t: dp.value[5] if dp.value[5]
                    field.gd$country = $t: dp.value[6] if dp.value[6]

                    addField "gd$structuredPostalAddress", field

            when 'CHAT'
                addField 'gd$im',
                    protocol: "http://schemas.google.com/g/2005##{dp.type}"
                    address: dp.value
                    rel: "http://schemas.google.com/g/2005#other"


             when 'SOCIAL', 'URL'
                field = href: dp.value
                if dp.type in ['home-page', 'blog', 'profile', 'home',
                    'work', 'other', 'ftp']
                    field.rel = dp.type
                else
                    field.label = dp.type

                addField 'gContact$website', field

            when 'ABOUT'
                field = gd$when: startTime: dp.value
                if dp.type is 'anniversary'
                    field.rel = dp.type
                else
                    field.label = dp.type

                addField 'gContact$event', field

            when 'RELATION'
                field = $t: dp.value
                if dp.type in ['assistant', 'brother', 'child',
                   'domestic-partner', 'father', 'friend', 'manager',
                   'mother', 'parent', 'partner', 'referred-by', 'relative',
                   'sister', 'spouse']
                   field.rel = dp.type

                else
                    field.label = dp.type

                addField 'gContact$relation', field

    if gEntry?
        return _extend gEntry, gContact
    else
        return gContact


PICTUREREL = "http://schemas.google.com/contacts/2008/rel#photo"
GCH.addContactPictureInCozy = (accessToken, cozyContact, gContact, done) ->
    log.debug "addContactPictureInCozy #{GCH.extractGoogleId(gContact)}"
    pictureLink = gContact.link.filter (link) -> link.rel is PICTUREREL
    pictureUrl = pictureLink[0]?.href
    hasPicture = pictureLink[0]?['gd$etag']?

    return done null unless pictureUrl and hasPicture

    opts = url.parse(pictureUrl)
    opts.headers =
        'Authorization': 'Bearer ' + accessToken
        'GData-Version': '3.0'
    log.debug "fetch #{GCH.extractGoogleId(gContact)} contact's picture"

    # timeoutID = null
    request = https.get opts, (stream) ->
        log.debug "response for #{GCH.extractGoogleId(gContact)} picture"

        stream.on 'error', done
        if stream.statusCode isnt 200
            return done new Error "error fetching #{pictureUrl}\
                            : #{stream.statusCode}"

        thumbStream = stream.pipe im().resize('300x300^').crop('300x300')
        thumbStream.on 'error', done
        thumbStream.path = 'useless'
        type = stream.headers['content-type']
        opts =
            name: 'picture'
            type: type
        cozyContact.attachFile thumbStream, opts, (err)->
            if err
                log.error "picture #{err}"
            else
                log.debug "picture ok"
            done err


GCH.putPicture2Google = (accessToken, account, contact, callback) ->
    # Check if picture ...
    unless contact._attachments?.picture?
        return callback()

    # Get picture as bytes.
    stream = contact.getFile 'picture', (err) ->
        return callback err if err

    options =
        method: 'PUT'
        host: 'www.google.com',
        port: 443,
        path: "/m8/feeds/photos/media/#{account.name}\
            /#{account.id}"
        headers:
            'Authorization': 'Bearer ' + accessToken
            'GData-Version': '3.0'
            'Content-Type': 'image/*'
            'If-Match': '*'

    req = https.request options, (res) ->

        res.on 'error', callback
        res.on 'data', (chunk) ->
            if res.statusCode isnt 200
                log.info "#{res.statusCode} while uploading picture: #{chunk.toString()}"
            callback()

    stream.pipe req


GCH.filterContactsOfAccountByIds = (cozyContacts, accountName) ->
    ofAccountByIds = {}
    for contact in cozyContacts
        account = contact.getAccount GCH.ACCOUNT_TYPE, accountName
        if account?
            ofAccountByIds[account.id] = contact

    return ofAccountByIds


GCH.fetchAccountName = (accessToken, callback) ->
    client = request.createClient 'https://www.googleapis.com'
    client.headers =
        'Authorization': 'Bearer ' + accessToken
        'GData-Version': '3.0'

    client.get '/oauth2/v2/userinfo', (err, res, body) ->
        return callback err if err
        if body.error
            log.info "Error while fetching account name : "
            log.info body
            return callback body

        callback null, body.email

# Update cozy with a google contact.
# Update the cozy contact if already synced,
# else, find a same contact in cozy and merge them
# else create a brand new cozy contact
# Return cozy contact updated or created to the cllabck
GCH.updateCozyContact = (gEntry, contacts, accountName, token, callback) ->
    Contact = require '../models/contact'
    ofAccountByIds = contacts.ofAccountByIds
    cozyContacts = contacts.cozyContacts

    fromGoogle = new Contact GCH.fromGoogleContact gEntry, accountName
    gId = GCH.extractGoogleId gEntry

    endSavePicture = (err, updatedContact) ->
        if err?
            log.error "An error occured while creating or updating the " + \
                      "contact."
            log.raw err
            return callback err

        log.debug "updated #{fromGoogle?.fn}"
        # Retrieve contact's picture.
        GCH.addContactPictureInCozy token, updatedContact, gEntry, callback

    updateContact = (fromCozy, fromGoogle) ->
        CompareContacts.mergeContacts fromCozy, fromGoogle
        fromCozy.save endSavePicture

    # already in cozy ?
    accountG = fromGoogle.accounts[0]
    if accountG.id of ofAccountByIds
        fromCozy = ofAccountByIds[accountG.id]
        accountC = fromCozy.getAccount GCH.ACCOUNT_TYPE, accountName
        if accountC.lastUpdate < accountG.lastUpdate and
           ContactHelper.intrinsicRev(fromGoogle) isnt ContactHelper.intrinsicRev(fromCozy)
            log.info "Update #{gId} from google"
            log.debug "Update #{fromCozy?.fn} from google"
            updateContact fromCozy, fromGoogle

        else # Already uptodate, nothing to do.
            log.info "Google contact #{gId} already synced and uptodate"
            log.debug "GContact #{fromCozy?.fn} already synced and uptodate"
            callback()

    else # Add to cozy.
        # look for same, take the first one
        fromCozy = null
        for cozyContact in cozyContacts
            if CompareContacts.isSamePerson cozyContact, fromGoogle
                fromCozy = cozyContact
                log.debug "#{fromCozy?.fn} is same person"
                break

        if fromCozy? and not fromCozy.getAccount(GCH.ACCOUNT_TYPE, accountName)?
            log.info "Link #{gId} to google account"
            log.debug "Link #{fromCozy?.fn} to google account"
            updateContact fromCozy, fromGoogle

        else # create
            log.info "Create #{gId} contact"
            log.debug "Create #{fromGoogle?.fn} contact"

            fromGoogle.revision = new Date().toISOString()
            Contact.create fromGoogle, endSavePicture
