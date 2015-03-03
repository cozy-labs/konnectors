http = require 'http'
americano = require 'americano'
Client = require('request-json').JsonClient
module.exports = helpers = {}

helpers.prefix = '../'

# server management
helpers.options =
    serverHost: process.env.HOST or 'localhost'
    serverPort: process.env.PORT or 9358

# default client
client = new Client "http://#{helpers.options.serverHost}:#{helpers.options.serverPort}/"

# set the configuration for the server
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
