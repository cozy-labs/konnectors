async = require "async"
moment = require "moment"
log = require('printit')
    prefix: null
    date: true
importer = require "./importer"
Konnector = require '../models/konnector'

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
                and konnector.lastAutoImport?

                    importInterval = periods[konnector.importInterval]
                    now = moment()
                    lastImport = moment(konnector.lastImport)
                    lastAutoImport = moment(konnector.lastAutoImport)

                    # debug
                    console.log "now = #{now.format(format)}"
                    console.log "lastimport = #{lastImport.format(format)}"
                    console.log "lastAutoimport = #{lastAutoImport.format(format)}"

                    # if we missed an import interval
                    if (now.valueOf() - lastAutoImport.valueOf()) > importInterval
                        log.debug "#{konnector.slug} missed an import interval"

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
                        console.log "nextupdate = #{nextUpdate.format(format)}"

                        @prepareNextCheck konnector, interval
                        callback()

                    # if we didn't missed an import interval
                    else
                        #interval = (lastAutoImport + importInterval) - now
                        interval = (lastAutoImport.valueOf() + importInterval)
                        interval -= now.valueOf()
                        log.debug "#{konnector.slug}: didnt miss interval"

                        nextUpdate = now.clone()
                        nextUpdate = nextUpdate.add interval, 'ms'
                        log.debug "nextupdate = #{nextUpdate.format(format)}"

                        @prepareNextCheck konnector, interval
                        callback()
                else
                    callback()

    handleTimeout: (konnector) ->

        # Retrive current Autoimport value in database
        Konnector.find konnector.id, (err, savedKonnector) =>

            currentInterval = savedKonnector.importInterval

            # If the importInterval has changed
            if konnector.importInterval isnt currentInterval

                # if there is already a timeout for this konnector, destroy it
                if timeouts[konnector.slug]?
                    clearTimeout timeouts[konnector.slug]
                    delete timeouts[konnector.slug]

                if konnector.importInterval isnt 'none'
                    # Create/Update lastAutoImport in database
                    data =
                        lastAutoImport: moment()

                    savedKonnector.updateAttributes data, (err) =>
                        if err
                            log.error err

                        @create konnector

    create: (konnector) ->

        interval = periods[konnector.importInterval]

        # Check if interval value is more than 10 sec
        # And if the value is in the periods list
        if interval? and interval > 10000
            @prepareNextCheck konnector, interval
        else
            log.info "konnector #{konnector.slug} has an " +
            "incorrect importInterval value"

    prepareNextCheck: (konnector, interval) ->

        # dirty hack for bypassing timeout max value
        if konnector.time?
            interval = konnector.time

        if interval > (23 * day)
            konnector['time'] = interval - (23 * day)
            interval = 23 * day
        else
            if konnector.time?
                delete konnector.time

        @createTimeout konnector, interval

    createTimeout: (konnector, interval) ->

        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add interval, 'ms'
        log.info "Next check of konnector #{konnector.slug} on " +
        "#{nextUpdate.format(format)}"
        timeouts[konnector.slug] = setTimeout @checkImport.bind(@, konnector, interval), interval

    checkImport: (konnector, interval) ->

        # if the timeout is unfinished
        if not konnector.time?
            importer konnector
            interval = periods[konnector.importInterval]

        @prepareNextCheck konnector, interval

module.exports = new KonnectorPoller
