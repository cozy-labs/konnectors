should = require 'should'
Konnector = require '../server/models/konnector'

describe 'Appending config data to a connector', ->
    before ->
        @konnectorsConfig = require '../server/lib/konnector_hash'

    describe 'Config data exist', ->

        before ->
            @konnector = new Konnector slug: 'free'

        it 'The connector should exist in connnectors hash', ->
            should.exist @konnectorsConfig[@konnector.slug]

        it 'And it should not throw', ->
            @konnector.appendConfigData.bind(@konnector).should.not.throw()

        it 'And the config data should be set', ->
            konnector = @konnector.toJSON()
            expectedProperties = [
                'name', 'description', 'fields', 'models', 'vendorLink'
            ]
            konnector.should.have.properties expectedProperties


    describe "Config data doesn't exist", ->

        before ->
            @konnector = new Konnector slug: 'unexistingconnector'

        it 'The connector should not exist in connnectors hash', ->
            should.not.exist @konnectorsConfig[@konnector.slug]

        it 'And it should throw', ->
            @konnector.appendConfigData.bind(@konnector).should.throw()
