americano = require 'americano'
RealtimeAdapter = require 'cozy-realtime-adapter'
localization = require './server/lib/localization_manager'
initKonnectors = require './server/init/konnectors'
poller = require './server/lib/poller'
commitPatch = require './server/init/patch_commits'
log = require('printit')
    prefix: 'konnectors'

process.env.TZ = 'UTC'

params =
    name: 'konnectors'
    port: process.env.PORT or 9358
    host: process.env.HOST or '127.0.0.1'
    root: __dirname


application = module.exports = (callback) ->
    americano.start params, (err, app, server) ->

        # Configure realtime listening.
        realtime = RealtimeAdapter server, [
            'konnector.update'
            'folder.*'
        ]

        localization.initialize ->
            initKonnectors ->
                poller.start()
                log.info 'Import poller started.'
                callback(app, server) if callback?


if not module.parent
    application()

