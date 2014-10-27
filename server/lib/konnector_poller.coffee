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

class KonnectorPoller

    start: ->
        log.debug "Launching Konnector Poller..."
        @init()

    init: ->
        Konnector.all (err, konnectors) =>
            async.eachSeries konnectors, (konnector, callback) =>
                if konnector.importInterval? and konnector.importInterval isnt 'none'
                    # dirty hack for bypassing timeout limit
                    if konnector.importInterval is 'month'
                        konnector['month'] = true
                        interval = 23 * day
                    else
                        interval = periods[konnector.importInterval]
                    # Check interval value
                    if interval > 0
                        @prepareNextCheck konnector, interval
                    else
                        log.debug """konnector #{konnector.slug} has an incorrect importInterval value"""
                callback()

     prepareNextCheck: (konnector, interval) ->
        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add interval, 'ms'
        log.info "Next check of konnector #{konnector.slug} on #{nextUpdate.format(format)}"
        setTimeout @checkImport.bind(@, konnector, interval), interval

    checkImport: (konnector, interval) ->

        if konnector.month?
            delete konnector.month
            @prepareNextCheck konnector, week
        else
            importer konnector
            @prepareNextCheck konnector, interval

module.exports = new KonnectorPoller
