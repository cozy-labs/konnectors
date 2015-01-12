request = require './lib/request'
KonnectorListener = require './realtime'
KonnectorsCollection = require '../collections/konnectors'
AppView = require './views/app_view'
Router = require './router'

# The function called from index.html
# Starts the application
$ ->

    # Localization management
    locale = window.locale
    polyglot = new Polyglot()
    try
        locales = require "locales/#{locale}"
    catch e
        locales = require 'locales/en'

    polyglot.extend locales
    window.t = polyglot.t.bind polyglot

    # Initialize data
    initKonnectors = window.initKonnectors or []
    konnectors = new KonnectorsCollection initKonnectors

    # Initialize realtime
    remoteChangeListener = new KonnectorListener()
    remoteChangeListener.watch konnectors

    # Initialize main view
    appView = new AppView collection: konnectors
    appView.render()

    window.router = new Router {appView}

    # Makes this object immutable.
    Object.freeze this if typeof Object.freeze is 'function'

    # Starts the application after the konnectors have been loaded
    request.get 'folders', (err, paths) ->
        appView.setFolders paths
        Backbone.history.start()

