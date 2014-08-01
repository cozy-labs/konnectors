americano = require 'americano'
RealtimeAdapter = require 'cozy-realtime-adapter'

process.env.TZ = 'UTC'

params =
    name: 'konnectors'
    port: process.env.PORT || 9358

americano.start params, (app, server) ->
    realtime = RealtimeAdapter server: server, ['konnector.update']
