path = require 'path'
fs = require 'fs'
async = require 'async'
log = require('printit')
    prefix: 'init'
    date: true

Konnector = require '../models/konnector'
konnectorModules = require '../lib/konnector_hash'
Bill = require '../models/bill'

# List of konnectors for which the slug has changed
konnectorsToMigrate = [
    { oldSlug: 'virginmobile', newSlug: 'virgin_mobile' },
    { oldSlug: 'sncf', newSlug: 'voyages_sncf' }
]

# List of fields do update
# Format of element :
#     model: an instance of the model for which the field has to be changed
#     vendor: vendor which provided data (string)
#     field: field of model to be updated (string)
#     match: the element to be changed (string or regexp)
#     replace: replacement of match (string)
fieldsToMigrate = [
    { model: Bill, vendor: 'SNCF', field: 'vendor',
    match: /^SNCF$/, replace: 'VOYAGES SNCF' }
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

# This patch is to migrate user's account due to a change in the
# konnector interface. The field 'username' is replaced by the
# field 'login' to harmonize with other konnectors.

patchOnlineNet = (callback) ->
    Konnector.request 'bySlug', key: 'online_net', (err, konnectors) ->
        return callback err if err
        if not konnectors.length
            return callback()

        konnector = konnectors[0]
        accounts = konnector.accounts
        if accounts[0]? && accounts[0].username
            log.info "Starting migration for online.net konnector"
            newAccounts = []
            for account in accounts
                account.login = account.username
                delete account.username
                newAccounts.push(account)
            
            konnector.updateAttributes accounts: newAccounts, (err) ->
                return callback err if err

                log.info "Successfully updated online.net konnector"
                callback()

        else
            callback()

# Applies all the migrations due to patches
patches = (callback) ->
    patch060 ->
        patch381 ->
            patchOnlineNet ->
                callback()

# Applies all the migrations due to evolution in the konnector name or vendor
migrations = (callback) ->
    migrateKonnectors ->
        migrateFields ->
            callback()


# Ensure that all konnector modules have a proper module created and that their
# isImporting flag is set to false.
module.exports = (callback) ->

    patches ->
        migrations ->
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
            log.error err
            return callback err
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
                return callback err
            else
                Konnector.create konnector, (err) ->
                    log.error err if err
                    return callback err
    else
        Konnector.create konnector, (err) ->
            log.error err if err
            return callback err


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
                callback()
        else
            callback()

# Migrate all the konnectors listed in konnectorsToMigrate
migrateKonnectors = (callback) ->
    async.eachSeries konnectorsToMigrate, (slugs, done) ->
        migrateKonnector slugs.oldSlug, slugs.newSlug, done
    , (err) ->
        if err
            log.error err
            return callback err

        log.info "All konnectors successfully migrated"
        callback()

migrateField = (model, vendor, field, match, replace, callback) ->
    model.request 'byVendor', key: vendor, (err, entries) ->
        return callback err if err
        filteredEntries = entries.filter (entry) ->
            return entry[field].match(match).length

        if filteredEntries.length
            async.eachSeries filteredEntries, (entry, done) ->
                data =
                    "#{field}": entry[field].replace(match, replace)
                entry.updateAttributes data, (err) ->
                    if err
                        log.error err
                        return done err
                    done()
            , (err) ->
                return callback err if err
                log.info "Successfully migrated field #{field} of \
                         #{model.displayName} from #{match} to #{replace}"
                callback()
        else
            callback()

migrateFields = (callback) ->
    async.eachSeries fieldsToMigrate, (fieldToMigrate, done) ->
        {model, vendor, field, match, replace} = fieldToMigrate
        migrateField model, vendor, field, match, replace, done
    , (err) ->
        return callback err if err
        log.info "Successfully migrated all fields"
        callback()
