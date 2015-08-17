cozydb = require 'cozydb'
async = require 'async'
fs = require 'fs'
crypto = require 'crypto'

Helper = require '../lib/contact_helper'

log = require('printit')
    prefix: 'Contact Model'


# Datapoints is an array of { name, type, value ...} objects,
# values are typically String. Particular case, adr :
# name: 'adr',
# type: 'home',
# value: ['','', '12, rue Basse', 'Paris','','75011', 'France']
class DataPoint extends cozydb.Model
    @schema:
        name: String
        value: cozydb.NoSchema
        pref: Boolean
        type: String

class Account extends cozydb.Model
    @schema:
        type: String
        name: String
        id: String
        lastUpdate: String



module.exports = class Contact extends cozydb.CozyModel
    @docType: 'contact'
    @schema:
        id            : String
        # vCard FullName = display name
        # (Prefix Given Middle Familly Suffix), or something else.
        fn            : String
        # vCard Name = splitted
        # (Familly;Given;Middle;Prefix;Suffix)
        n             : String
        org           : String
        title         : String
        department    : String
        bday          : String
        nickname      : String
        url           : String
        revision      : String
        datapoints    : [DataPoint]
        note          : String
        tags          : [String]
        binary        : Object
        _attachments  : Object
        accounts      : [Account]

    @cast: (attributes, target) ->
        target = super attributes, target

        return target

# Update revision each time a change occurs
Contact::updateAttributes = (changes, callback) ->
    changes.revision = new Date().toISOString()
    super


# Update revision each time a change occurs
Contact::save = (callback) ->
    @revision = new Date().toISOString()
    super


Contact::intrinsicRev = () ->
    # Put fields in deterministic order and create a string.
    fieldNames = [ 'fn', 'n', 'org', 'title',
        # 'department', #Unused in google contacts
        'bday', 'nickname',
        'url',# TODO : Z determinism !
        'note',
        # TODO 'tags'
        # TODO attachments ?
    ]

    asStr = ''
    for fieldName in fieldNames
        if fieldName of @ and @[fieldName]? and @[fieldName] isnt ''
            asStr += fieldName
            asStr += ': '
            asStr += @[fieldName]
            asStr += ', '

    # convert Datapoints to strings
    stringDps = @datapoints.map (datapoint) ->
        s = "name:#{datapoint.name}, type:#{datapoint.type}, value: "

        if datapoint.name is 'adr'
            s += Helper.adrArrayToString datapoint.value
        else if datapoint.name is 'tel'
            s += datapoint.value?.replace /[^\d+]/g, ''
        else
            s += datapoint.value

    # sort them.
    stringDps.sort()

    asStr += "datapoints: " + stringDps.join ', '

    return asStr
    # # Get SHA-1
    # shasum = crypto.createHash('sha1')
    # shasum.update asStr
    # return shasum.digest 'base64'


Contact.extractGoogleId = (gEntry) ->
        uri = gEntry.id?.$t
        if uri?
            parts = uri.split '/'
            return parts[parts.length - 1]

Contact.fromGoogleContact = (gContact, accountName)->
    return unless gContact?

    contact =
        docType: 'contact'
        fn: gContact.gd$name?.gd$fullName?.$t

        org: gContact?.gd$organization?[0]?.gd$orgName?.$t
        title: gContact?.gd$organization?[0]?.gd$orgTitle?.$t
        # department
        bday: gContact.gContact$birthday?.when
        nickname: gContact.gContact$nickname?.$t
        note: gContact.content?.$t

        # revision      : <-- todo ?
        #tags          : ['google']
        accounts : [
            type: 'com.google'
            name: accountName
            id: Contact.extractGoogleId gContact
            lastUpdate: gContact.updated?.$t
        ]
        #??binary        : Object

    nameComponent = (field) ->
        part = gContact.gd$name?[field]?.$t or ''
        return part.replace /;/g, ' '


    contact.n = "#{nameComponent('gd$familyName')};#{nameComponent('gd$givenName')};#{nameComponent('gd$additionalName')};#{nameComponent('gd$namePrefix')};#{nameComponent('gd$nameSuffix')}"

        #  SOCIAL.
    getTypeFragment = (component) ->
        return component.rel?.split('#')[1] or component.label or 'other'
    getTypePlain = (component) ->
        return component.rel or component.label or 'other'


    contact.datapoints = []
    for email in gContact.gd$email or []
        contact.datapoints.push
            name: "email"
            pref: email.primary or false
            value: email.address
            type: getTypeFragment email


    for phone in gContact.gd$phoneNumber or []
        contact.datapoints.push
            name: "tel"
            pref: phone.primary or false
            value: phone.uri?.replace('tel:', '').replace(/-/g, ' ')
            type: getTypeFragment phone

    for im in gContact.gd$im or []
        contact.datapoints.push
            name: "chat"
            value: im.address
            type: im.protocol?.split('#')[1] or 'other'

    for adr in gContact.gd$structuredPostalAddress or []
        contact.datapoints.push
            name: "adr"
            # value: ["", "", adr.gd$formattedAddress?.$t, "", "", "", ""]
            value: ["", "", adr.gd$street?.$t or "",
                adr.gd$city?.$t or ""
                adr.gd$region?.$t or ""
                adr.gd$postcode?.$t or ""
                adr.gd$country?.$t or ""
            ]
            type: getTypeFragment adr

    websites = gContact.gContact$website?.slice() or []
    if gContact.gContact$website?.length > 0
        contact.url = gContact.gContact$website[0].href
        websites = gContact.gContact$website.slice 1

        for web in websites
    # for web in gContact.gContact$website or []
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

    return contact

Contact::toGoogleContact = (gEntry) ->
    _extend = (a, b) ->
        for k, v of b
            if v?
                a[k] = v
        return a

    gContact = updated: $t: @revision

    [lastName, firstName, middleName, prefix, suffix] = @n.split ';'
    name = {}
    name.gd$fullName = $t: @fn
    name.gd$familyName = $t: lastName if lastName? and lastName isnt ''
    name.gd$givenName = $t: firstName if firstName? and firstName isnt ''
    name.gd$additionalName = $t: middleName if middleName? and middleName isnt ''
    name.gd$namePrefix = $t: prefix if prefix? and prefix isnt ''
    name.gd$nameSuffix = $t: suffix if suffix? and suffix isnt ''
    gContact.gd$name = name

    gContact.gContact$birthday = when: @bday if @bday?
    gContact.gContact$nickname = $t: @nickname if @nickname?
    gContact.content = $t: @note if @note?

    if @org? or @title?
        org = rel: "http://schemas.google.com/g/2005#other"
        org.gd$orgName = $t: @org if @org?
        org.gd$orgTitle = $t: @title if @title?
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

    if @url
        addField 'gContact$website',
            href: @url
            rel: 'other'

    for dp in @datapoints
        name = dp.name.toUpperCase()
        switch name
            when 'TEL'
                addField 'gd$phoneNumber', setTypeFragment dp, $t: dp.value

            when 'EMAIL'
                field = setTypeFragment dp, address: dp.value
                field.primary = "true" if field.pref

                addField 'gd$email', field

            when 'ADR'
                if dp.value instanceof Array
                    field = setTypeFragment dp, {}
                    field.gd$formattedAddress = Helper.adrArrayToString dp.value

                    street = Helper.adrCompleteStreet dp.value
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



Contact::getName = ->
    # Checks first if the contact doesn't
    # exist already by comparing the names
    # or emails if name is not specified.
    name = ''
    if @fn? and @fn.length > 0
        name = @fn
    else if @n and @n.length > 0
        name = @n.split(';').join(' ').trim()
    else
        for dp in @datapoints
            if dp.name is 'email'
                name = dp.value

    return name

Contact::getAccount = (accountType, accountName) ->
    return null unless @accounts?

    account = @accounts.filter (account) ->
        return account.type is accountType and account.name is accountName

    if account.length > 0
        return account[0]
    else
        return null

Contact::setAccount = (account) ->
    current = @getAccount account.type, account.name
    if current?
        for k, v of account
            current[k] = v
    else
        @accounts = @accounts or []
        @accounts.push account


Contact::deleteAccount = (account) ->
    for current, i in @accounts
        if current.type is account.type and current.name is account.name
            @accounts.splice i, 1
            return true

    return false


Contact.all = (callback)->
    Contact.request 'all', callback