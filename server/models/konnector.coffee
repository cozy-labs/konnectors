americano = require 'americano-cozy'
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

Konnector.all = (callback) ->
    Konnector.request 'all', (err, konnectors) ->
        konnectors.forEach (konnector) -> konnector.injectEncryptedFields()
        callback err, konnectors

Konnector::injectEncryptedFields = ->
    try
        parsedPasswords = JSON.parse @password
        for name, val of parsedPasswords
            @fieldValues[name] = val
    catch error
        log.info "Injecting encrypted fields : JSON.parse error : #{error}"

Konnector::removeEncryptedFields = (fields) ->

    if not fields?
        log.info "Removing encrypted fields : error : fields variable undefined"

    password = {}
    for name, type of fields
        if type is "password"
            password[name] = @fieldValues[name]
            delete @fieldValues[name]
    @password = JSON.stringify password

Konnector::import = (konnector, fields, callback) ->
    @fieldValues = konnector.fieldValues
    @isImporting = true
    @removeEncryptedFields fields
    @importInterval = konnector.importInterval
    @save (err) =>

        if err
            data =
                isImporting: false
                lastImport: new Date()
            @updateAttributes data, (err) ->
                callback err

        else
            konnectorModule = require "../konnectors/#{@slug}"
            @injectEncryptedFields()
            konnectorModule.fetch @fieldValues, (err) =>
                @removeEncryptedFields fields

                if err
                    data =
                        isImporting: false
                    @updateAttributes data, ->
                        callback err

                else
                    data =
                        isImporting: false
                        lastImport: new Date()
                    @updateAttributes data, (err) ->
                        if err then callback err
                        else callback()


# Append data from connector's configuration file, if it exists
Konnector::appendConfigData = ->
    konnectorData = konnectorHash[@slug]

    unless konnectorData?
        msg = "Config data cannot be appended for konnector #{@slug}: " + \
              "missing config file."
        throw new Error msg

    # add missing fields
    konnectorData = konnectorHash[@slug]
    for key of konnectorData
        @[key] = konnectorData[key]

    # normalize models' name related to the connector
    modelNames = []
    for key, value of @models
        name = value.toString()
        name = name.substring '[Model '.length
        name = name.substring 0, (name.length - 1)
        modelNames.push name
    @modelNames = modelNames

    return @


Konnector.getKonnectorsToDisplay = (callback) ->
    Konnector.all (err, konnectors) ->
        if err?
            callback err
        else
            try
                konnectorsToDisplay = konnectors
                    .filter (konnector) ->
                        # if the connector has config data
                        return konnectorHash[konnector.slug]?
                    .map (konnector) ->
                        konnector.appendConfigData()
                        return konnector

                    callback null, konnectorsToDisplay
            catch err
                callback err
