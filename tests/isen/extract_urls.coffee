should = require 'should'
Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'
helpers = require './helpers'

describe 'ISEN Konnector - .extractUrls', ->

    describe 'When an event has a course URL', ->

        it 'it should be found in results', (done) ->
            event = new Event helpers.getRawEvent()
            Isen.extractUrls [event], (err, list) ->
                should.not.exist err
                should.exist list
                list.length.should.equal 1
                done()

    describe 'When two events haven the same course URL', ->

        it 'it should appear only once in the results', (done) ->
            event = new Event helpers.getRawEvent()
            Isen.extractUrls [event, event], (err, list) ->
                should.not.exist err
                should.exist list
                list.length.should.equal 1
                done()

    describe "When an event doesn't have a course URL", ->

        it 'there should be an error', (done) ->
            event = new Event helpers.getRawEvent()
            event.details = ""
            Isen.extractUrls [event], (err, list) ->
                should.not.exist err
                should.exist list
                list.length.should.equal 0
                done()
