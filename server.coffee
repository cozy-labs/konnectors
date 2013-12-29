americano = require 'americano'
printit = require 'printit'
RealtimeAdapter = require 'cozy-realtime-adapter'

initKonnectors = require './server/init/konnectors'

log = printit
    prefix: null
    date: true

process.env.TZ = 'UTC'

port = params =
    name: 'konnectors'
    port: process.env.PORT || 9358

americano.start params, (app, server) ->
    realtime = RealtimeAdapter server: server, ['konnector.update']

    initKonnectors (err) ->
        if err
            log.error "An error occured."
            log.error "Konnectors were not properly initialized."
        else
            log.info "all konnectors are created."

