cozydb = require 'cozydb'
async = require 'async'
konnectorHash = require '../lib/konnector_hash'

log = require('printit')
    prefix: null
    date: true


module.exports = Konnector = cozydb.getModel 'Konnector',
    slug: String
    # This field is no more used, still there for backward compability
    fieldValues: Object
    accounts: [Object], default: [{}]
    password:
        type: String
        default: '[{}]'
    lastSuccess: Date
    lastImport: Date
    lastAutoImport: Date
    isImporting: type: Boolean, default: false
    importInterval: type: String, default: 'none'
    errorMessage: type: String, default: null
    importErrorMessage: type: String, default: null


# Retrieve all konnectors. Make sure that encrypted fields are decrypted before
# being sent.
Konnector.all = (callback) ->
    Konnector.request 'all', (err, konnectors) ->
        konnectors ?= []
        for konnector in konnectors
            konnector.injectEncryptedFields()
        callback err, konnectors


# Return a konnector for a given key.
Konnector.get = (slug, callback) ->
    Konnector.request 'all', (err, konnectors) ->
        konnector = konnectors.find (konnector) -> konnector.slug is slug
        callback err, konnector


# Return fields registered in the konnector module. If it's not defined,
# it uses the current fields.
Konnector::getFields = ->
    if konnectorHash[@slug]?
        return konnectorHash[@slug]?.fields
    else
        return @fields


# Unencrypt password fields and set them as normal fields.
Konnector::injectEncryptedFields = ->
    try
        parsedPasswords = JSON.parse @password
        @cleanFieldValues()
        for passwords, i in parsedPasswords
            if @accounts[i]?
                @accounts[i][name] = val for name, val of passwords
    catch error
        log.error "Attempt to retrieve password for #{@slug} failed: #{error}"
        log.error @password
        log.error "It may be due to an error while unencrypting password field."


# Remove encrypted fields data from field list. Set password attribute with
# encrpyted fields data to save them encrypted.
# The data system by default encrypt the password attribute on every object.
Konnector::removeEncryptedFields = (fields) ->

    if not fields?
        log.warn "Fields variable undefined, use curren one instead."
        fields = @getFields()

    @cleanFieldValues()
    password = []

    for account in @accounts
        passwords = {}
        for name, type of fields when type is "password"
            passwords[name] = account[name]
            delete account[name]
        password.push passwords

    @password = JSON.stringify password


# Update field values with the one given in parameters.
Konnector::updateFieldValues = (data, callback) ->
    fields = @getFields()
    data.accounts ?= []
    data.accounts.unshift data.fieldValues if data.fieldValues?

    @accounts = data.accounts
    @removeEncryptedFields fields
    @importInterval = data.importInterval or @importInterval

    data =
        accounts: @accounts
        password: @password
        importInterval: @importInterval
    @updateAttributes data, (err) =>
        callback err, @


# Run import process for given konnector. It runs the fetch command for each
# account set via the accounts attributes.
# If an error occured on a given import, it stops the process and marks the
# whole connector with errors.
Konnector::import = (callback) ->

    @cleanFieldValues()

    @updateAttributes isImporting: true, (err) =>
        async.mapSeries @accounts, (values, next) =>
            @runImport values, next
        , (err, notifContents) =>
            if err
                log.error err
                errMessage = \
                    if err.message? then err.message else err.toString()
                data =
                    isImporting: false
                    lastImport: new Date()
                    importErrorMessage: errMessage.replace(/<[^>]*>/ig, '')

            else
                data =
                    isImporting: false
                    lastSuccess: new Date()
                    lastImport: new Date()
                    importErrorMessage: null

            @updateAttributes data, (err) ->
                log.info 'Konnector metadata updated.'
                callback err, notifContents


Konnector::runImport = (values, callback) ->

    if err?
        log.error 'An error occured while modifying konnector state'
        log.raw err

        callback err

    else
        konnectorModule = konnectorHash[@slug]

        @injectEncryptedFields()
        values.lastSuccess = @lastSuccess
        konnectorModule.fetch values, (importErr, notifContent) =>
            fields = @getFields()
            @removeEncryptedFields fields

            if importErr? and \
            typeof(importErr) is 'object' and \
            importErr.message?
                callback importErr, notifContent

            else if importErr? and typeof(importErr) is 'string'
                callback importErr, notifContent

            else
                callback null, notifContent


# Append data from module file of curent konnector.
Konnector::appendConfigData = (konnectorData) ->
    konnectorData ?= konnectorHash[@slug]

    unless konnectorData?
        msg = "Config data cannot be appended for konnector #{@slug}: " + \
              "missing config file."
        throw new Error msg

    # add missing fields
    @[key] = konnectorData[key] for key of konnectorData

    # Build a string list of the model names. Models are the one linked to the
    # konnector.
    modelNames = []
    for key, value of @models
        name = value.toString()

        if name.indexOf('Constructor') isnt -1
            name = name.substring 0, (name.length - 'Constructor'.length)
        else
            match = name.match /function ([^(]+)/
            if match? and match[1]?
                name = match[1]

        modelNames.push name
    @modelNames = modelNames

    return @


# Build list of available konnectors. Retrieve information from database and
# add infos from konnector module files.
Konnector.getKonnectorsToDisplay = (callback) ->
    Konnector.all (err, konnectors) ->
        if err?
            log.error 'An error occured while retrieving konnectors'
            callback err
        else
            try
                konnectorsToDisplay = konnectors
                    .filter (konnector) ->
                        return konnectorHash[konnector.slug]?
                    .map (konnector) ->
                        konnector.appendConfigData()
                        return konnector

                callback null, konnectorsToDisplay
            catch err
                log.error 'An error occured while filtering konnectors'
                callback err


# Patch function to move fieldValues field to accounts field. accounts field is
# different because it's an array of field values (the goal is to allow several
# accounts instead of one).
Konnector::cleanFieldValues = ->

    if @fieldValues?
        @accounts ?= []
        if Object.keys(@fieldValues).length > 0
            @accounts.unshift @fieldValues
        @fieldValues = null

    if @password? and @password[0] is '{'
        password = JSON.parse @password
        @password = JSON.stringify [password]

