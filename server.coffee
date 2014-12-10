americano = require 'americano'
RealtimeAdapter = require 'cozy-realtime-adapter'
initKonnectors = require './server/init/konnectors'
patchKonnectors = require './server/init/patch'
poller = require './server/lib/konnector_poller'

process.env.TZ = 'UTC'

params =
    name: 'konnectors'
    port: process.env.PORT or 9358
    host: process.env.HOST or '127.0.0.1'
    root: __dirname

hello = (a) ->
    console.log 'ok'

americano.start params, (app, server) ->
    realtime = RealtimeAdapter server: server, ['konnector.update']
    initKonnectors ->
        console.log "A"
        patchKonnectors ->
            console.log "B"
            poller.start()

