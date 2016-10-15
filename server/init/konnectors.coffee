path = require 'path'
fs = require 'fs'
async = require 'async'
log = require('printit')
    prefix: 'init'
    date: true

Konnector = require '../models/konnector'
konnectorModules = require '../lib/konnector_hash'


konnectorsToMigrate = [
    oldSlug: 'virginmobile', newSlug: 'virgin_mobile'
]

# Ensure that model fields are properly configured for 0.6.0 version.
# It means that account information are stored in the accounts field and
# that password is properly constructed to handle multiple accounts.
patch060 = (callback) ->
    Konnector.request 'all',  (err, konnectors) ->
        async.eachSeries konnectors, (konnector, done) ->
            if konnector.fieldValues?
                slug = konnector.slug
                log.info "Cleaning fields for konnector #{slug}..."
                konnector.cleanFieldValues()
                data =
                    fieldValues: konnector.fieldValues
                    accounts: konnector.accounts
                    password: konnector.password

                konnector.updateAttributes data, (err) ->
                    if err
                        log.info "An error occured cleaning konnector #{slug}"
                        log.error err
                    else
                        log.info "Fields for konnector #{slug} are cleaned."
                    done()
            else
                done()
        , (err) ->
            callback()

# Delete error messages of already deleted configurations (i.e.
# no more credentials
patch381 = (callback) ->
    Konnector.request 'all', (err, konnectors) ->
        async.eachSeries konnectors, (konnector, done) ->
            if konnector.accounts.length is 0 and konnector.importErrorMessage
                data =
                    importErrorMessage : null

                slug = konnector.slug
                konnector.updateAttributes data, (err) ->
                    if err
                        log.info "An error occured cleaning konnector #{slug}"
                        log.error err
                    else
                        log.info "Fields for konnector #{slug} are cleaned."
                    done()
            else
                done()
        , (err) ->
            callback()


patches = (callback) ->
    patch060 ->
        patch381 ->
            callback()

# Ensure that all konnector modules have a proper module created and that their
# isImporting flag is set to false.
module.exports = (callback) ->

    patches ->
        migrateKonnectors ->
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


# Reset konnector importing flags: isImporting flag is set to false if value
# is true. This happens when the app is crashing while importing.
konnectorResetValue = (konnector, callback) ->

    if konnector.isImporting or konnector.fieldValues
        log.info "Reseting isImporting field for #{konnector.slug}..."
        konnector.cleanFieldValues()
        data =
            isImporting: false
        konnector.updateAttributes data, (err) ->
            slug = konnector.slug
            if err
                log.info "An error occured reseting isImporting for #{slug}"
                log.error err
            else
                log.info "IsImporting field for #{slug} is reseted."
                log.info "#{konnector.slug} fields cleaned."
            callback()

    else
        callback()


# Get the list of konnectors that are not listed in database.
getKonnectorsToCreate = (konnectorHash) ->

    konnectorsToCreate = []

    for name, konnectorModule of konnectorModules
        unless konnectorHash[konnectorModule.slug]?
            konnectorsToCreate.push konnectorModule
            log.info "New konnector to init: #{name}"

    return konnectorsToCreate


# Init and create all given konnectors
createKonnectors = (konnectorsToCreate, callback) ->

    async.eachSeries konnectorsToCreate, (konnector, done) ->

        initializeKonnector konnector, done

    , (err) ->
        if err
            log.err err
            callback err
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


# Migrate a konnector to a new name/slug to keep the credentials (ie the
# migration is transparent to the user).
migrateKonnector = (oldSlug, newSlug, callback) ->

    Konnector.request 'bySlug', key: oldSlug, (err, konnectors) ->
        return callback err if err
        if konnectors.length
            konnectors[0].updateAttributes slug: newSlug, (err) ->
                if err
                    log.error err
                    return callback err

                log.info "Konnector with slug #{oldSlug} successfully migrated \
                         to #{newSlug}"
                return callback()
        else
            callback()

migrateKonnectors = (callback) ->
    async.eachSeries konnectorsToMigrate, (slugs, done) ->
        migrateKonnector slugs.oldSlug, slugs.newSlug, done
    , (err) ->
        if err
            log.error err
            return callback err

        log.info "All konnectors successfully migrated"
        callback()
