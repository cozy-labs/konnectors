module.exports =

    initialize: ->
        # Routing management
        Router = require 'router'
        @router = new Router()
        Backbone.history.start()

        # Locale management
        @locale = window.locale
        @polyglot = new Polyglot()
        try
            locales = require 'locales/'+ @locale
        catch e
            locales = require 'locales/en'

        @polyglot.extend locales
        window.t = @polyglot.t.bind @polyglot
        console.log window.t


        # Makes this object immuable.
        Object.freeze this if typeof Object.freeze is 'function'
