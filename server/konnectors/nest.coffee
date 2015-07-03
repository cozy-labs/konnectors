NestApi = require 'nest-api'
americano = require 'americano-cozy'

localization = require '../lib/localization_manager'
fetcher = require '../lib/fetcher'
saveDataAndFile = require '../lib/save_data_and_file'

log = require('printit')
    prefix: "Nest"
    date: true


# Models

NestTemperature = americano.getModel 'NestTemperature',
    date: Date
    currentTemperature: String
    targetTemperature: String


NestTemperature.all = (callback) ->
    NestTemperature.request 'byDate', callback


# Fetching layers

getTemperature = (requiredFields, data, nothing, next) ->

    nestApi = new NestApi requiredFields.email, requiredFields.password

    nestApi.login ->
        nestApi.get (nestData) ->
            shared = nestData.shared[Object.keys(nestData.shared)[0]]

            entry = {}
            entry.currentTemperature = shared.current_temperature
            entry.targetTemperature = shared.target_temperature
            entry.date = new Date()
            data.fetched = [entry]

            next()


# Konnector

module.exports =

    name: "Nest"
    slug: "nest"
    description: 'Get Nest temperature history'
    vendorLink: "https://nest.com/"

    fields:
        email: "text"
        password: "password"
    models:
        nestTemperature: NestTemperature

    init: (callback) ->
        log.info "Nest init"
        map = (doc) -> emit doc.date, doc
        NestTemperature.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetcher.new()
            .use(getTemperature)
            .use(saveDataAndFile log, NestTemperature, {})
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->

                log.info "Import finished"

                notifContent = null
                callback err, notifContent

