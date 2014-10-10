americano = require 'americano-cozy'


module.exports = Konnector = americano.getModel 'Konnector',
    slug: String
    fieldValues: Object
    password: type: String, default: '{}'
    lastImport: Date
    isImporting: type: Boolean, default: false


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
        console.log "injecting encrypted fields : JSON.parse error : #{error}"

Konnector::removeEncryptedFields = (fields) ->

    password = {}
    for name, type of fields
        if type is "password"
            password[name] = @fieldValues[name]
            delete @fieldValues[name]
    @password = JSON.stringify password

Konnector::import = (fieldValues, fields, callback) ->
    @fieldValues = fieldValues
    @isImporting = true
    @removeEncryptedFields fields
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
                        lastImport: new Date()
                    @updateAttributes data, ->
                        callback err

                else
                    data =
                        isImporting: false
                        lastImport: new Date()
                    @updateAttributes data, (err) ->
                        if err then callback err
                        else callback()
