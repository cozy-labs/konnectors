should = require 'should'
fs = require 'fs'
path = require 'path'

localesDirectory = path.resolve __dirname, '../client/app/locales/'
listOfLocales = fs.readdirSync localesDirectory

describe 'Check locale files:', ->

    # en is the default language
    localesToCheck = listOfLocales.filter((l) -> l isnt 'en.json')
    english = require path.resolve localesDirectory, 'en.json'

    localesToCheck.forEach (localeName) ->

        locale = require path.resolve localesDirectory, localeName

        keys = []
        describe "ensure all the element in en.json are translated in #{localeName}.", ->
            for key of english
                do (key) ->
                    keys.push key
                    it "'#{key}' should be translated in #{localeName}", ->
                        should.exist locale[key]

        describe "ensure all the element in #{localeName} are translated in en.json", ->

            for key of locale
                do (key) ->
                    if keys.indexOf(key) is -1
                        it "'#{key}' should be translated in en.json", ->
                            should.exist english[key]

    describe "ensure a key is defined only once in the files", ->
        listOfLocales.forEach (locale) ->
            describe "#{locale}", ->
                file = fs.readFileSync((path.resolve localesDirectory, locale), 'utf8')
                localeObject = require path.resolve localesDirectory, locale

                for key of localeObject
                    do (key) ->
                        key = key.replace(/\./g, '\\.')
                        matches = file.match( new RegExp("['\"]" + key + "[\\]*['\"][ ]*\:", 'g')) || []
                        it "'#{key}' should be only once in the file", ->
                            matches.should.have.length 1
