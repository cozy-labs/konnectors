americano = require 'cozydb'
konnectorHash = require '../lib/konnector_hash'

log = require('printit')
    prefix: null
    date: true


module.exports = Konnector = americano.getModel 'Konnector',
    slug: String
    fieldValues: Object
    password: type: String, default: '{}'
    lastImport: Date
    lastAutoImport: Date
    isImporting: type: Boolean, default: false
    importInterval: type: String, default: 'none'
    errorMessage: type: String, default: null


# Retrieve all konnectors. Make sure that encrypted fields are decrypted before
# being sent.
Konnector.all = (callback) ->
    Konnector.request 'all', (err, konnectors) ->
        konnectors ?= []
        konnectors.forEach (konnector) -> konnector.injectEncryptedFields()
        callback err, konnectors


# Unencrypt password fields and set them as normal fields.
Konnector::injectEncryptedFields = ->
    try
        parsedPasswords = JSON.parse @password
        @fieldValues[name] = val for name, val of parsedPasswords
    catch error
        @fieldValues ?= {}
        @fieldValues.password = @password
        @password = password: @password
        log.info "Injecting encrypted fields : JSON.parse error : #{error}"


# Return fields registered in the konnector module. If it's not defined,
# it uses the current fields.
Konnector::getFields = ->
    if konnectorHash[@slug]?
        return konnectorHash[@slug]?.fields
    else
        return @fields


# Remove encrypted fields data from field list. Set password attribute with
# encrpyted fields data to save them encrypted.
# The data system by default encrypt the password attribute on every object.
Konnector::removeEncryptedFields = (fields) ->

    if not fields?
        log.warn "Fields variable undefined, use curren one instead."
        fields = @getFields()

    password = {}
    for name, type of fields when type is "password"
        password[name] = @fieldValues[name]
        delete @fieldValues[name]
    @password = JSON.stringify password


# Update field values with the one given in parameters.
Konnector::updateFieldValues = (newKonnector, callback) ->
    fields = @getFields()

    @fieldValues = newKonnector.fieldValues
    @removeEncryptedFields fields

    data =
        fieldValues: @fieldValues
        password: @password
        importInterval: newKonnector.importInterval or @importInterval
    @updateAttributes data, callback


# Run import process for given konnector.
Konnector::import = (callback) ->
    @updateAttributes isImporting: true, (err) =>

        if err?
            log.error 'An error occured while modifying konnector state'
            log.raw err

            data =
                isImporting: false
                lastImport: new Date()
            @updateAttributes data, callback

        else
            konnectorModule = konnectorHash[@slug]

            @injectEncryptedFields()
            konnectorModule.fetch @fieldValues, (err, notifContent) =>
                fields = @getFields()
                @removeEncryptedFields fields

                if err? and Object.keys(err).length > 0
                    data = isImporting: false, errorMessage: err
                    @updateAttributes data, ->
                        # raise the error from the import, not the update
                        callback err, notifContent

                else
                    data =
                        isImporting: false
                        lastImport: new Date()
                        errorMessage: null
                    @updateAttributes data, (err) -> callback err, notifContent


# Append data from module file of curent konnector.
Konnector::appendConfigData = ->
    konnectorData = konnectorHash[@slug]

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
        if name.indexOf 'Constructor' isnt -1
            name = name.substring 0, (name.length - 'Constructor'.length)
        modelNames.push name
    @modelNames = modelNames

    return @


# Build list of available konnectors. Retrieve information from database and
# add infos from konnector module files.
Konnector.getKonnectorsToDisplay = (callback) ->
    Konnector.all (err, konnectors) ->
        if err?
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
                callback err

