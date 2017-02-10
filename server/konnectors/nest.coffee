NestApi = require 'nest-api'
cozydb = require 'cozydb'

localization = require '../lib/localization_manager'
fetcher = require '../lib/fetcher'
saveDataAndFile = require '../lib/save_data_and_file'

log = require('printit')
    prefix: "Nest"
    date: true


# Models

Temperature = cozydb.getModel 'Temperature',
    vendor: {type: String, default: 'Nest'}
    date: Date
    currentTemperature: String
    targetTemperature: String


Temperature.all = (callback) ->
    Temperature.request 'byDate', callback


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
    description: 'konnector description nest'
    vendorLink: "https://nest.com/"

    category: 'energy'
    color:
        hex: '#95A2AA'
        css: '#95A2AA'

    fields:
        email:
            type: "text"
        password:
            type: "password"

    dataType: [
        'temperature'
    ]

    models:
        nestTemperature: Temperature

    init: (callback) ->
        log.info "Nest init"
        map = (doc) -> emit doc.date, doc
        Temperature.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetcher.new()
            .use(getTemperature)
            .use(saveDataAndFile log, Temperature, {})
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->

                log.info "Import finished"

                notifContent = null
                callback err, notifContent
