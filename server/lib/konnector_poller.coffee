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

                if konnector.importInterval? \
                and konnector.importInterval isnt 'none'
                    @create konnector
                    callback()
                else
                    callback()

    handleTimeout: (konnector) ->
        # if there is already a timeout for this konnector, destroy it
        if timeouts[konnector.slug]?
            clearTimeout timeouts[konnector.slug]
            delete timeouts[konnector.slug]
        if konnector.importInterval isnt 'none'
            @create konnector

    create: (konnector) ->
        # dirty hack for bypassing timeout limit
        if konnector.importInterval is 'month'
            konnector['month'] = true
            interval = 23 * day
        else
            interval = periods[konnector.importInterval]
        # Check if interval value is more than 10 sec
        if interval? and interval > 10000
            @prepareNextCheck konnector, interval
        else
            log.info "konnector #{konnector.slug} has an " +
            "incorrect importInterval value"

    prepareNextCheck: (konnector, interval) ->
        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add interval, 'ms'
        log.info "Next check of konnector #{konnector.slug} on " +
        "#{nextUpdate.format(format)}"
        timeouts[konnector.slug] = setTimeout @checkImport.bind(@, konnector, interval), interval

    checkImport: (konnector, interval) ->

        if konnector.month?
            delete konnector.month
            @prepareNextCheck konnector, week
        else
            importer konnector
            @prepareNextCheck konnector, interval

module.exports = new KonnectorPoller
