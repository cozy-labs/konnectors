sinon = require 'sinon'
should = require 'should'
Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'
helpers = require './helpers'

rawEvent = helpers.getRawEvent()

describe 'ISEN Konnector - .processEvents', ->

    describe "When there's no rawEvent to process", ->

        before ->
            @sandbox = sinon.sandbox.create()

            # mock the createOrUpdate method to prevent it from creating the event
            @stub = @sandbox.stub Event, 'createOrUpdate'
            modelEvent = new Event rawEvent
            # stub will call the second argument as callback
            @stub.callsArgWithAsync 1, null, modelEvent

        after -> @sandbox.restore()

        it "there is no event", (done) ->
            rawEvents = []
            Isen.processEvents rawEvents, (err, events) ->
                should.not.exist err
                should.exist events
                events.length.should.equal 0
                done()

        it "and createOrUpdate should not be called", ->
            @stub.callCount.should.equal 0

    describe "When rawEvent doesn't exist", ->

        before ->
            @sandbox = sinon.sandbox.create()

            # mock the createOrUpdate method to prevent it from creating the event
            @stub = @sandbox.stub Event, 'createOrUpdate'
            modelEvent = new Event rawEvent
            # stub will call the second argument as callback
            @stub.callsArgWithAsync 1, null, modelEvent

        after -> @sandbox.restore()

        it "should be found in results", (done) ->
            rawEvents = [rawEvent]
            Isen.processEvents rawEvents, (err, events) ->
                should.not.exist err
                should.exist events
                events.length.should.equal 1
                done()

        it "and createOrUpdate should be called with the right parameters", ->
            @stub.calledOnce.should.be.ok
            @stub.getCall(0).calledWithExactly null, rawEvent

    describe "When rawEvent already exist", ->

        before ->
            @sandbox = sinon.sandbox.create()

            # mock the createOrUpdate method to prevent it from creating the event
            @stub = @sandbox.stub Event, 'createOrUpdate'
            modelEvent = new Event rawEvent
            # stub will call the second argument as callback
            @stub.callsArgWithAsync 1, null, modelEvent

        after -> @sandbox.restore()

        it "should be found in results too", (done) ->
            rawEvents = [rawEvent]
            Isen.processEvents rawEvents, (err, events) =>
                should.not.exist err
                should.exist events
                events.length.should.equal 1
                should.exist events[0]
                events[0].should.have.property 'id', 'Aurion-1514469'
                done()

        it "and createOrUpdate should be called with the right parameters", ->
            @stub.calledOnce.should.be.ok
            @stub.getCall(0).calledWithExactly null, rawEvent

    describe "When an error occurs", ->

        before ->
            @sandbox = sinon.sandbox.create()

            # mock the createOrUpdate method to prevent it from creating the event
            @stub = @sandbox.stub Event, 'createOrUpdate'
            # stub will call the second argument as callback
            # send an error
            @stub.callsArgWithAsync 1, "random error", null

        after -> @sandbox.restore()

        it "should be found in results", (done) ->
            rawEvents = [rawEvent]
            Isen.processEvents rawEvents, (err, events) =>
                should.not.exist err
                should.exist events
                events.length.should.equal 0
                done()

        it "and createOrUpdate should be called with the right parameters", ->
            @stub.calledOnce.should.be.ok
            @stub.getCall(0).calledWithExactly "random error"
