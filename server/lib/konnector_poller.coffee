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

class KonnectorPoller

    start: ->
        log.debug "Launching Konnector Poller..."
        @init()

    init: ->
        Konnector.all (err, konnectors) =>

            async.eachSeries konnectors, (konnector, callback) =>

                # if both importInterval and lastAutoImport are valid
                if konnector.importInterval? \
                and konnector.importInterval isnt 'none' \
                and konnector.lastAutoImport? \
                and fs.existsSync path.resolve("server/konnectors/#{konnector.slug}.coffee")

                    importInterval = periods[konnector.importInterval]
                    now = moment()
                    lastImport = moment(konnector.lastImport)
                    lastAutoImport = moment(konnector.lastAutoImport)

                    # if we missed an importation cycle
                    if (now.valueOf() - lastAutoImport.valueOf()) > importInterval
                        log.debug "#{konnector.slug} missed an importation cycle"

                        # calculate the supposed last Auto-import
                        importTime = lastAutoImport.valueOf() + importInterval

                        # calculate the time elapsed
                        while importTime < now.valueOf()
                            importTime += importInterval
                        interval = importTime - now.valueOf()

                        # We import now
                        importer konnector

                        nextUpdate = now.clone()
                        nextUpdate = nextUpdate.add interval, 'ms'
                        log.debug "#{konnector.slug} | Next update : " +
                        "#{nextUpdate.format(format)}"

                        @prepareNextCheck konnector, interval
                        callback()

                    # if we didn't missed an import interval
                    else
                        #interval = (lastAutoImport + importInterval) - now
                        interval = (lastAutoImport.valueOf() + importInterval)
                        interval -= now.valueOf()
                        log.debug "#{konnector.slug} didn't miss an importation cycle"

                        nextUpdate = now.clone()
                        nextUpdate = nextUpdate.add interval, 'ms'
                        log.debug "#{konnector.slug} | Next update : " +
                        "#{nextUpdate.format(format)}"

                        @prepareNextCheck konnector, interval
                        callback()
                else
                    callback()

    handleTimeout: (konnector) ->

        # if date is present in fieldValues
        startDate = konnector.fieldValues.date if konnector.fieldValues.date?
        # Retrive current Autoimport value in database
        Konnector.find konnector.id, (err, savedKonnector) =>
            savedKonnector.injectEncryptedFields()

            currentInterval = savedKonnector.importInterval

            # If the importInterval has changed
            if konnector.importInterval isnt currentInterval

                # if there is already a timeout for this konnector, destroy it
                if timeouts[konnector.slug]?
                    clearTimeout timeouts[konnector.slug]
                    delete timeouts[konnector.slug]

                if konnector.importInterval isnt 'none'

                    diff = 0

                    if startDate? and startDate isnt ''

                        now = moment()
                        firstImportDate = moment(startDate, "DD-MM-YYYY")

                        diff = firstImportDate.valueOf() - now.valueOf()

                        # We set the date of the first import
                        data = lastAutoImport: firstImportDate

                        fields = konnectorHash[savedKonnector.slug]
                        savedKonnector.removeEncryptedFields fields

                        # Create/Update lastAutoImport in database
                        savedKonnector.updateAttributes data, (err) =>
                            if err
                                log.error err

                            log.debug "First import set to " +
                            "#{firstImportDate.format(format)}"

                    else
                        # We set the current time
                        data =
                            lastAutoImport: moment()

                        fields = konnectorHash[savedKonnector.slug]
                        savedKonnector.removeEncryptedFields fields

                        # Create/Update lastAutoImport in database
                        savedKonnector.updateAttributes data, (err) =>
                            if err
                                log.error err

                    @create konnector, diff

    create: (konnector, diff) ->

        # if diff is present and valid
        if diff > 0
            interval = diff
        else
            interval = periods[konnector.importInterval]

        # Check if interval value is more than 10 sec
        # And if the value is in the periods list
        if interval? and interval > 10000
            @prepareNextCheck konnector, interval
        else
            log.info "konnector #{konnector.slug} has an " +
            "incorrect importInterval value"

    prepareNextCheck: (konnector, interval) ->

        ## dirty hack for bypassing timeout max value

        # If time exists, assign that value to interval
        if konnector.time?
            interval = konnector.time

        # if interval is more than 23 days,
        # save the excess in konnector['time']
        if interval > (23 * day)
            konnector['time'] = interval - (23 * day)
            interval = 23 * day
        else
            # if interval value is less than 23 days,
            if konnector.time?
                # time is no longer needed
                delete konnector.time

        @createTimeout konnector, interval

    createTimeout: (konnector, interval) ->

        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add interval, 'ms'

        log.info "Next check of konnector #{konnector.slug} on " +
        "#{nextUpdate.format(format)}"
        # Create the timeout and place it timeouts
        timeouts[konnector.slug] = setTimeout @checkImport.bind(@, konnector, interval), interval

    checkImport: (reference, interval) ->
        # retrieves the last version of the konnector
        Konnector.find reference.id, (err, konnector) =>

            # mandatory injection of encrypted fields
            konnector.injectEncryptedFields()

            # if there is time left, do not import
            if not konnector.time?
                importer konnector

                # Update if actual interval is not the same in the konnector
                interval = periods[konnector.importInterval]

            @prepareNextCheck konnector, interval

module.exports = new KonnectorPoller
