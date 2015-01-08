americano = require 'americano-cozy'
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
