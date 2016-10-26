request = require './lib/request'
KonnectorListener = require './realtime'
KonnectorCollection = require '../collections/konnectors'
FolderCollection = require '../collections/folders'
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
        locale = 'en'
        locales = require 'locales/en'

    polyglot.extend locales
    window.t = polyglot.t.bind polyglot

    # Initialize data
    initKonnectors = window.initKonnectors or []
    initFolders = window.initFolders or []
    konnectors = new KonnectorCollection initKonnectors
    folders = new FolderCollection initFolders

    # Initialize realtime
    remoteChangeListener = new KonnectorListener()
    remoteChangeListener.watch konnectors
    remoteChangeListener.watch folders

    # Initialize main view
    appView = new AppView
        collection: konnectors
        folders: folders
    appView.render()

    # Init Backbone router
    window.router = new Router {appView}
    Backbone.history.start()

