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
interval = {hour: hour, day: day, week: week, month: month}

class KonnectorPoller

    start: ->
        @init()

    init: ->
        Konnector.all (err, konnectors) =>
            async.eachSeries konnectors, (konnector, callback) =>
                if konnector.importInterval? and konnector.importInterval isnt 'none'
                    log.debug konnector.slug
                    @prepareNextCheck konnector, interval[konnector.importInterval]
                callback()

     prepareNextCheck: (konnector, interval) ->
        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add interval, 'ms'
        log.info "Next import of konnector #{konnector.slug} on #{nextUpdate.format(format)}"
        setTimeout @checkImport.bind(@, konnector, interval), interval

    checkImport: (konnector, interval) ->
        importer konnector
        @prepareNextCheck konnector, interval

module.exports = new KonnectorPoller
