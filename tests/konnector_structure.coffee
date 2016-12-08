should = require 'should'
fs = require 'fs'
path = require 'path'
slugify = require 'cozy-slug'

konnectorsDirectory = path.resolve __dirname, '../server/konnectors/'
localesDirectory = path.resolve __dirname, '../client/app/locales/'

describe 'Check all konnectors', ->
    listOfKonnectors = fs.readdirSync konnectorsDirectory
    listOfLocales = fs.readdirSync localesDirectory

    listOfKonnectors.forEach (filename) ->
        subString = filename.split('.')
        name = subString[0]
        describe name, ->
            it "#{filename} should contain only one dot", ->
                (subString.length - 1).should.equal 1

            try
                konnector = require path.resolve konnectorsDirectory , filename
                describe "should have", ->
                    it "a name", ->
                        should.exist konnector.name

                    it "a slug", ->
                        should.exist konnector.slug

                    it "fields which are objects with a type property", ->
                        should.exist konnector.fields
                        for fieldName in konnector.fields
                            konnector.fields[fieldName].should.be.an.Object
                            should.exist konnector.fields[fieldName].type

                    it "models", ->
                        should.exist konnector.models

                    it "a description", ->
                        should.exist konnector.description

                    it "and fetch function", ->
                        should.exist konnector.fetch

                    it "slug should equal the filename", ->
                        konnector.slug.replace(/(-|\.)/g, '_').should.equal name

                do (konnector) ->
                    for locale in listOfLocales
                        translation = require path.resolve localesDirectory, locale
                        describe "translations should be done in #{locale}", ->
                            it "konnector description should be translated", ->
                                should.exist translation[konnector.description]
                            do (translation, locale, konnector) ->
                                describe "each field of the konnector should be translated", ->
                                    for field of konnector.fields
                                        do(translation, field) ->
                                            it "#{field}", ->
                                                should.exist translation[field]
