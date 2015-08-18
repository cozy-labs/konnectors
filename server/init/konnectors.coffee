path = require 'path'
fs = require 'fs'
async = require 'async'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'
konnectorModules = require '../lib/konnector_hash'


# Ensure that all konnector modules have a proper module created and that their
# isImporting flag is set to false.
module.exports = (callback) ->
    Konnector.all (err, konnectors) ->
        if err
            log.error err
            callback err

        else
            konnectorHash = {}
            async.eachSeries konnectors, (konnector, done) ->
                konnectorHash[konnector.slug] = konnector
                konnectorResetValue konnector, done

            , (err) ->
                log.error err if err

                konnectorsToCreate = getKonnectorsToCreate konnectorHash

                if konnectorsToCreate.length is 0
                    callback()
                else
                    createKonnectors konnectorsToCreate, callback


# Reset konnector importing flags: isImporting flage is set to false if value
# is true. This happens when the app is crashing while importing.
konnectorResetValue = (konnector, callback) ->

    if konnector.isImporting is true

        konnector.updateAttributes isImporting: false, (err) ->
            if err
                log.debug "#{konnector.slug} | #{err}"
            else
                log.debug "#{konnector.slug}: reseting isImporting"
            callback()
    else
        callback()


# Get the list of konnectors that are not listed in database.
getKonnectorsToCreate = (konnectorHash) ->

    konnectorsToCreate = []

    for name, konnectorModule of konnectorModules
        unless konnectorHash[konnectorModule.slug]?
            konnectorsToCreate.push konnectorModule

    return konnectorsToCreate


# Init and create all given konnectors
createKonnectors = (konnectorsToCreate, callback) ->

    async.eachSeries konnectorsToCreate, (konnector, done) ->

        initializeKonnector konnector, done

    , (err) ->
        log.info 'All konnectors created'
        callback()


# Run konnector initialization function (mostly used for request initializing).
# Then save konnector data to database.
initializeKonnector = (konnector, callback) ->

    log.debug "creating #{konnector.slug}"
    if konnector.init?
        konnector.init (err) ->
            if err
                log.error err
                callback err
            else
                Konnector.create konnector, (err) ->
                    log.error err if err
                    callback err
    else
        Konnector.create konnector, (err) ->
            log.error err if err
            callback err

