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
        konnectors.forEach (konnector) -> konnector.injectEncryptedFields()
        callback err, konnectors


# Unencrypt password fields and set them as normal fields.
Konnector::injectEncryptedFields = ->
    try
        parsedPasswords = JSON.parse @password
        for name, val of parsedPasswords
            @fieldValues[name] = val
    catch error
        log.info "Injecting encrypted fields : JSON.parse error : #{error}"


# Remove encrypted fields data from field list. Set password attribute with
# encrpyted fields data to save them encrypted.
# The data system by default encrypt the password attribute on every object.
Konnector::removeEncryptedFields = (fields) ->

    if not fields?
        log.info "Removing encrypted fields: error: fields variable undefined"

    password = {}
    for name, type of fields
        if type is "password"
            password[name] = @fieldValues[name]
            delete @fieldValues[name]
    @password = JSON.stringify password


# Update field values with the one given in parameters.
Konnector::updateFieldValues = (newValues, callback) ->
    fields = konnectorHash[@slug].fields
    @fieldValues = newValues.fieldValues
    @removeEncryptedFields fields
    @importInterval = newValues.importInterval
    data =
        fieldValues: @fieldValues
        importInterval: @importInterval
    @updateAttributes data, callback


# Run import process for given konnector..
Konnector::import = (callback) ->
    @updateAttributes isImporting: true, (err) =>

        if err?
            data =
                isImporting: false
                lastImport: new Date()
            @updateAttributes data, callback

        else
            konnectorModule = require "../konnectors/#{@slug}"

            @injectEncryptedFields()
            konnectorModule.fetch @fieldValues, (err, notifContent) =>
                fields = konnectorHash[@slug].fields
                @removeEncryptedFields fields

                if err?
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
    konnectorData = konnectorHash[@slug]
    @[key] = konnectorData[key] for key of konnectorData

    # normalize models' name related to the connector
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

