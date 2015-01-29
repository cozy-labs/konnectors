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
timeouts = {}
nextUpdates = {}
timeout = null

class KonnectorPoller

    start: (reset=false, cb=null) ->
        log.debug "Launching Konnector Poller..."

        if reset
            nextUpdates = {}
        if Object.keys(nextUpdates).length is 0
            Konnector.all (err, konnectors) =>
                async.eachSeries konnectors, (konnector, callback) =>
                    # if both importInterval and lastAutoImport are valid
                    if konnector.importInterval? \
                    and konnector.importInterval isnt 'none' \
                    and konnector.lastAutoImport? \
                    and fs.existsSync path.resolve("server/konnectors/#{konnector.slug}.coffee")
                        nextUpdate = @findNextUpdate(konnector)
                        nextUpdates[konnector.slug] = [nextUpdate, konnector]
                        callback()
                    else
                        callback()
                , (err) =>
                    # Initialize every day to avoid to have lots of long timeout.
                    @prepareNextCheck()
                    if timeout?
                        clearTimeout timeout
                    timeout = setTimeout @start.bind(@), day
                    cb() if cb?
        else
            @prepareNextCheck()
            if timeout?
                clearTimeout timeout
            timeout = setTimeout @start.bind(@), day
            cb() if cb?

    findNextUpdate: (konnector) ->
        importInterval = periods[konnector.importInterval]
        now = moment()
        lastImport = moment(konnector.lastImport)
        lastAutoImport = moment(konnector.lastAutoImport)

        # if we missed an importation cycle
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
            callback()

        # if we didn't missed an import interval
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

    handleTimeout: (konnector, cb=null) ->
        # Update timeouts and nextUpdates for this new/modified konnector

        # If date is present in fieldValues
        startDate = konnector.fieldValues.date if konnector.fieldValues.date?
        # Retrive current Autoimport value in database
        Konnector.find konnector.id, (err, savedKonnector) =>
            savedKonnector.injectEncryptedFields()
            currentInterval = savedKonnector.importInterval

            # If the importInterval has changed or it's a new
            if konnector.importInterval isnt currentInterval

                # if there is already a timeout for this konnector, destroy it
                if timeouts[konnector.slug]?
                    clearTimeout timeouts[konnector.slug]
                    delete timeouts[konnector.slug]
                if konnector.importInterval isnt 'none'
                    # Auto import present

                    if startDate? and startDate isnt ''
                        #nextUpdates[konnector.slug] = moment(startDate, "DD-MM-YYYY")
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
                            cb() if cb?

                    else
                        # We set the current time
                        data =
                            lastAutoImport: new Date()
                        konnector.lastAutoImport = new Date()
                        fields = konnectorHash[savedKonnector.slug]
                        savedKonnector.removeEncryptedFields fields
                        # Create/Update lastAutoImport in database
                        savedKonnector.updateAttributes data, (err, body) ->
                            if err
                                log.error err
                        @create konnector, @findNextUpdate(konnector)
                        cb() if cb?

    create: (konnector, nextUpdate) ->

        now = moment()
        nextUpdates[konnector.slug] = [nextUpdate, konnector]
        interval = nextUpdate.diff now.clone(), 'ms'
        if interval < day
            @createTimeout konnector, interval

    prepareNextCheck: () ->
        for slug in Object.keys(nextUpdates)
            # If interval is more than 1 day,
            # timeout isn't started (prepareNextCheck call every day)
            [nextUpdate, konnector]  = nextUpdates[slug]
            now = moment()
            interval = nextUpdate.diff now.clone(), 'ms'
            if interval < day
                @createTimeout konnector, interval

    createTimeout: (konnector, interval) ->
        timeouts[konnector.slug] = setTimeout @checkImport.bind(@, konnector, interval), interval


    checkImport: (konnector, interval) ->
        importer konnector
        now = moment()
        nextUpdate = now.add periods[konnector.importInterval], 'ms'
        @create konnector, nextUpdate


module.exports = new KonnectorPoller
