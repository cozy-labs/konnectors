path = require 'path'
Konnector = require path.join  __dirname, '../server/models/konnector'
konnectorMap = require path.join  __dirname, '../server/lib/konnector_hash'

log = require('printit')
    prefix: 'Konnector dev tool'


# Display most important fields of a konnector. It hides the password
# in case some are stored in the field values of the connector.
displayKonnector = (konnector) ->
    data =
        slug: konnector.slug
        fieldValues: konnector.fieldValues
        fields: konnector.fields
        lastSuccess: konnector.lastSuccess
        lastImport: konnector.lastImport
        isImporting: konnector.isImporting
        importInterval: konnector.importInterval
        importErrorMessage: konnector.importErrorMessage

    log.lineBreak()
    for key, value of data
        if key is 'fieldValues'
            console.log "fieldValues:"
            for fieldKey, fieldValue of value
                if fieldKey isnt 'password'
                    console.log "    #{fieldKey}: #{fieldValue}"
                else
                    console.log "    #{fieldKey}: *******"
        else
            if key isnt 'password'
                console.log "#{key}: #{value}"
            else
                console.log "#{key}: ******"
    log.lineBreak()


module.exports =


    # Run an import to avoid running the full web app.
    run: (konnectorName, callback) ->
        Konnector.all (err, konnectors) ->
            konnectorHash = {}
            for konnector in konnectors
                konnectorHash[konnector.slug] = konnector

            konnector = konnectorHash[konnectorName]

            if not konnector?
                callback new Error "Konnector not found."

            else
                log.info "Import starting..."
                konnector.fieldValues ?= {}
                konnector.import ->
                    callback()


    # Allow to change field values of connector. That way the import can be
    # runned without loading the full web app.
    # Expected format for fields is an array of string following this syntax:
    # ["key1:value1", "key2:value2"]
    change: (konnectorName, fields, callback) ->
        fieldValues = {}
        for field in fields
            [key, value] = field.split(':')
            fieldValues[key] = value

        Konnector.all (err, konnectors) ->
            return callback err if err

            konnector = konnectors.find (konnector) ->
                konnector.slug is konnectorName
            konnectorMetaData = konnectorMap[konnector.slug]

            for key, value of fieldValues
                unless konnectorMetaData.fields[key]
                    delete fieldValues[key]

            if konnector
                konnector.updateAttributes {fieldValues}, callback
            else
                callback new Error(
                    "Can't find given konnector (slug expected).")


    # Display konnector information stored in the database. It helps debugging
    # by ensuring that values are properly set.
    display: (konnectorName, callback) ->
        Konnector.all (err, konnectors) ->
            if konnectorName
                konnector = konnectors.find (konnector) ->
                    konnector.slug is konnectorName
                displayKonnector konnector
            else
                displayKonnector konnector for konnector in konnectors
            callback()

