async = require "async"
moment = require "moment"
log = require('printit')
    prefix: null
    date: true
fs = require 'fs'
path = require 'path'

importer = require "./importer"
Konnector = require '../models/konnector'
konnectorHash = require '../lib/konnector_hash'

hour = 60 * 60 * 1000
day = 24 * hour
week = 7 * day
month = 30 * day
format = "DD/MM/YYYY [at] HH:mm:ss"
periods = {hour: hour, day: day, week: week, month: month}

class KonnectorPoller


    constructor: () ->
        # Timeout for prepareNextCheck (call every day)
        @timeout = null
        # Timeouts for all konnectors (contains only timeout for the current day)
        @timeouts = {}
        # Contains all nextUpdate for each konnector.
        @nextUpdates = {}


    start: (reset=false, callback=null) ->
        # reset and callback are usefull for tests.
        log.debug "Launching Konnector Poller..."
        if reset
            @nextUpdates = {}
        if Object.keys(@nextUpdates).length is 0
            # First initialization
            Konnector.all (err, konnectors) =>
                async.eachSeries konnectors, (konnector, next) =>
                    # If both importInterval and lastAutoImport are valid
                    if konnector.importInterval? \
                    and konnector.importInterval isnt 'none' \
                    and konnector.lastAutoImport? \
                    and konnectorHash[konnector.slug]?
                        @initializeKonnectorUpdates konnector
                    next()
                , (err) =>
                    callback() if callback?
                    @manageNextChecks()
        else
            callback() if callback?
            @manageNextChecks()


    # Find next update and store it in nextUpdates
    initializeKonnectorUpdates: (konnector) ->
        nextUpdate = @findNextUpdate(konnector)
        @nextUpdates[konnector.slug] = [nextUpdate, konnector]


    # Prepare next check and timeout for the following
    manageNextChecks: () ->
        # Initialize every day to avoid to have lots of long timeout.
        @prepareNextCheck()
        if @timeout?
            clearTimeout @timeout
        @timeout = setTimeout @start.bind(@), day


    # Compute next update for <konnector>
    findNextUpdate: (konnector) ->
        importInterval = periods[konnector.importInterval]
        now = moment()
        lastImport = moment konnector.lastImport
        lastAutoImport = moment konnector.lastAutoImport

        # If we missed an importation cycle
        if (now.valueOf() - lastAutoImport.valueOf()) > importInterval
            log.debug "#{konnector.slug} missed an importation cycle"
            # We import now
            importer konnector

            # calculate the supposed last Auto-import
            importTime = lastAutoImport.add importInterval, 'ms'
            # calculate the time elapsed
            while importTime.valueOf() < now.valueOf()
                importTime = importTime.add importInterval, 'ms'

            log.debug "#{konnector.slug} | Next update : " +
            "#{importTime.format(format)}"
            return importTime

        # If we didn't missed an import interval
        else
            if lastAutoImport.valueOf() > now.valueOf()
                # possible if user precises a start date for auto import
                # TODOS : manage start date in other field than lastAutoImport
                nextUpdate = lastAutoImport
            else
                nextUpdate = lastAutoImport.add importInterval, 'ms'
            log.debug "#{konnector.slug} | Next update : " +
            "#{nextUpdate.format(format)}"
            return nextUpdate


    # Update timeouts and nextUpdates for this new/modified konnector
    handleTimeout: (konnector, callback=null) ->
        # If date is present in fieldValues
        startDate = konnector.fieldValues.date if konnector.fieldValues.date?
        # Retrive current Autoimport value in database
        Konnector.find konnector.id, (err, savedKonnector) =>
            savedKonnector.injectEncryptedFields()
            currentInterval = savedKonnector.importInterval
            # If the importInterval has changed or it's a new
            if konnector.importInterval isnt currentInterval

                # if there is already a timeout for this konnector, destroy it
                if @timeouts[konnector.slug]?
                    clearTimeout @timeouts[konnector.slug]
                    delete @timeouts[konnector.slug]
                if konnector.importInterval isnt 'none'
                    # Auto import present

                    if startDate? and startDate isnt ''
                        # We set the date of the first import
                        data = lastAutoImport: moment(startDate, "DD-MM-YYYY")
                        fields = konnectorHash[savedKonnector.slug]
                        savedKonnector.removeEncryptedFields fields
                        # Create/Update lastAutoImport in database
                        savedKonnector.updateAttributes data, (err) =>
                            if err
                                log.error err
                            log.debug "First import set to " +
                            "#{moment(startDate, "DD-MM-YYYY")}"
                            @create konnector, moment(startDate, "DD-MM-YYYY")
                            callback() if callback?

                    else
                        # We set the current time
                        data = lastAutoImport: new Date()
                        konnector.lastAutoImport = new Date()
                        fields = konnectorHash[savedKonnector.slug]
                        savedKonnector.removeEncryptedFields fields
                        # Create/Update lastAutoImport in database
                        savedKonnector.updateAttributes data, (err, body) ->
                            if err
                                log.error err
                        @create konnector, @findNextUpdate(konnector)
                        callback() if callback?


    # Add new konnector
    create: (konnector, nextUpdate) ->
        # Add konnector in nextUpdates
        @nextUpdates[konnector.slug] = [nextUpdate, konnector]
        # Create timeout if necessary
        @createTimeout konnector, nextUpdate


    # Check all konnectors and create timeout if necessary
    prepareNextCheck: () ->
        for slug in Object.keys(@nextUpdates)
            [nextUpdate, konnector]  = @nextUpdates[slug]
            @createTimeout konnector, nextUpdate


    # Start timeout if is less than 1 day
    # timeout isn't started - prepareNextCheck call every day
    createTimeout: (konnector, nextUpdate) ->
        now = moment()
        interval = nextUpdate.diff now.clone(), 'ms'
        if interval < day
            @startTimeout konnector, interval


    # Start timeout for konnector
    startTimeout: (konnector, interval) ->
        @timeouts[konnector.slug] = setTimeout @checkImport.bind(@, konnector, interval), interval


    # Import konnector and update nextUpdate
    checkImport: (konnector, interval) ->
        importer konnector
        now = moment()
        nextUpdate = now.add periods[konnector.importInterval], 'ms'
        @create konnector, nextUpdate


module.exports = new KonnectorPoller
