americano = require 'americano'
RealtimeAdapter = require 'cozy-realtime-adapter'
initKonnectors = require './server/init/konnectors'
patchKonnectors = require './server/init/patch'

process.env.TZ = 'UTC'

params =
    name: 'konnectors'
    port: process.env.PORT || 9358
    host: process.env.HOST or "0.0.0.0"
    root: __dirname

americano.start params, (app, server) ->
    realtime = RealtimeAdapter server: server, ['konnector.update']
    patchKonnectors -> initKonnectors()
