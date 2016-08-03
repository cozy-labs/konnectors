http = require 'http'
americano = require 'americano'
async = require 'async'
moment = require 'moment'

Client = require('request-json').JsonClient

Konnector = require '../server/models/konnector'


module.exports = helpers = {}

helpers.prefix = '../'

# Server management
helpers.options =
    serverHost: process.env.HOST or 'localhost'
    serverPort: process.env.PORT or 9358

# Default client
client = new Client "http://#{helpers.options.serverHost}:#{helpers.options.serverPort}/"

# Set the configuration for the server
process.env.HOST = helpers.options.serverHost
process.env.PORT = helpers.options.serverPort


# Returns a client if url is given, default app client otherwise
helpers.getClient = (url = null) ->
    if url?
        return new Client url
    else
        return client

initializeApplication = require "#{helpers.prefix}server"


helpers.startApp = (done) ->
    initializeApplication (app, server) =>
        @app = app
        @app.server = server
        done app, server


helpers.stopApp = (done) ->
    setTimeout =>
        @app.server.close done
    , 1000


helpers.clearKonnector = (slug, callback) ->

    Konnector.all (err, konnectors) =>

        konnectors = konnectors.filter (konnector) ->
            konnector.slug is 'free'

        async.eachSeries konnectors, (konnector, next) ->
            konnector.destroy next
        , ->
            callback()

helpers.getDate = (date) ->
    date = new Date date
    date.setUTCHours 0, 0, 0, 0
    return moment date
