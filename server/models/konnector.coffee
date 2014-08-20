americano = require 'americano-cozy'


module.exports = Konnector = americano.getModel 'Konnector',
    slug: String
    fieldValues: Object
    lastImport: Date
    isImporting: type: Boolean, default: false


Konnector.all = (callback) ->
    Konnector.request 'all', callback

Konnector::import = (fieldValues, callback) ->
    data =
        fieldValues: fieldValues
        isImporting: true

    @updateAttributes data, (err) =>

        if err
            data =
                isImporting: false
                lastImport: new Date()
            @updateAttributes data, (err) ->
                callback err

        else
            konnectorModule = require "../konnectors/#{@slug}"
            konnectorModule.fetch fieldValues, (err) =>

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
