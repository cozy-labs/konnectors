fs = require 'fs'
Polyglot = require 'node-polyglot'
Instance = require '../models/cozy_instance'

# Seeks the proper locale files, depending if we run from build/ or from sources
path = require 'path'
LOCALE_PATH = path.resolve __dirname, '../../client/app/locales/'


# Configure the Polyglot lib and returns the function that will handle
# all the translation (for a given key, it returns the right translation).
# All translations are stored in files. Each file is dedicated to a locale.
# The locale is set by the user in the Cozy platform and is stored in the
# CozyInstance object.
class LocalizationManager

    polyglot: null


    # Configure and returns the polyglot object depending on the
    # Run this function when the app starts.
    initialize: (callback) ->
        @retrieveLocale (err, locale) =>
            if err? then callback err
            else
                @polyglot = @getPolyglotByLocale locale
                callback null, @polyglot


    # Get locale from instance object. Returns "en" if no locale is found.
    retrieveLocale: (callback) ->
        Instance.getLocale (err, locale) ->
            if err? or not locale then locale = 'en' # default value
            callback err, locale


    # Returns Polyglot object configured for the given locale.
    # Default locale is en.
    getPolyglotByLocale: (locale) ->
        try
            phrases = require "#{LOCALE_PATH}/#{locale}"
        catch err
            phrases = require "#{LOCALE_PATH}/en"
        return new Polyglot locale: locale, phrases: phrases


    # execute polyglot.t, for server-side localization
    t: (key, params = {}) -> return @polyglot?.t key, params


    # for template localization
    getPolyglot: -> return @polyglot


module.exports = new LocalizationManager()

