path = require 'path'
cozydb = require 'cozydb'

log = require('printit')
    prefix: 'Konnector dev tool'


# Display most important fields of a konnector. It hides the password
# in case some are stored in the field values of the connector.
displayKonnector = (konnector) ->
    if konnector?
        konnector.removeEncryptedFields()
        log.raw
            slug: konnector.slug
            accounts: konnector.accounts
            fields: konnector.fields
            lastSuccess: konnector.lastSuccess
            lastImport: konnector.lastImport
            isImporting: konnector.isImporting
            importInterval: konnector.importInterval
            importErrorMessage: konnector.importErrorMessage
    else
        log.error "Can't find konnector #{konnector}."

    log.lineBreak()

module.exports =


    # Run an import to avoid running the full web app.
    run: (konnectorName, callback) ->
        Konnector = require '../server/models/konnector'
        konnectorConfig = require "../server/konnectors/#{konnectorName}"
        Konnector.get konnectorName, (err, konnector) ->
            return callback err if err
            konnector.appendConfigData konnectorConfig

            if not konnector?
                callback new Error "Konnector not found."

            else
                log.info "Import starting..."
                konnector.fieldValues ?= {}
                konnector.import (err) ->
                    log.error err if err
                    callback()


    # Allow to change field values of connector. That way the import can be
    # runned without loading the full web app.
    # Expected format for fields is an array of string following this syntax:
    # ["key1:value1", "key2:value2"]
    change: (konnectorName, fields, callback) ->
        account = {}
        for field in fields
            [key, value] = field.split(':')
            account[key] = value

        Konnector = require '../server/models/konnector'
        konnectorMap = require '../server/lib/konnector_hash'
        Konnector.all (err, konnectors) ->
            return callback err if err

            konnector = konnectors.find (konnector) ->
                konnector.slug is konnectorName
            konnectorMetaData = konnectorMap[konnector.slug]

            if konnector.accounts?.length > 0
                accounts = konnector.accounts
                for key, value of account
                    accounts[0][key] = value
            else
                accounts = [account]

            if konnector
                konnector.updateAttributes accounts: accounts, callback
            else
                callback new Error(
                    "Can't find given konnector (slug expected).")


    # Display konnector information stored in the database. It helps debugging
    # by ensuring that values are properly set.
    display: (konnectorName, callback) ->
        Konnector = require '../server/models/konnector'
        Konnector.all (err, konnectors) ->
            if konnectorName
                konnector = konnectors.find (konnector) ->
                    konnector.slug is konnectorName
                displayKonnector konnector
            else
                displayKonnector konnector for konnector in konnectors
            callback()


    init: (callback) ->
        initKonnectors = require '../server/init/konnectors'
        cozydb.configure {}, null, ->
            initKonnectors ->
                callback()

