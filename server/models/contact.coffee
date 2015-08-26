cozydb = require 'cozydb'
async = require 'async'

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


# An contact account in an external service (typically google contact).
# An account is uniquely identified by the couple of its type and name.
class Account extends cozydb.Model
    @schema:
        type: String
        name: String
        # Id of this contact in this service.
        id: String
        # Last update of this contact in this service.
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

# Return the account with specified type and name or null.
Contact::getAccount = (accountType, accountName) ->
    return null unless @accounts?

    account = @accounts.filter (account) ->
        return account.type is accountType and account.name is accountName

    if account.length > 0
        return account[0]
    else
        return null

# Add or update specified account.
Contact::setAccount = (account) ->
    current = @getAccount account.type, account.name
    if current?
        for k, v of account
            current[k] = v
    else
        @accounts = @accounts or []
        @accounts.push account

# Unlink this contact from the specifie account.
Contact::deleteAccount = (account) ->
    for current, i in @accounts
        if current.type is account.type and current.name is account.name
            @accounts.splice i, 1
            return true

    return false


Contact.all = (callback)->
    Contact.request 'all', callback
