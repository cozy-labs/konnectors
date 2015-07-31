should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'

helpers = require './helpers'

describe 'ISEN Konnector - .checkEventsToDelete', ->

    describe 'When the event is not in range', ->

        before ->
            @sandbox = sinon.sandbox.create()
            rawEvent = helpers.getRawEvent()
            @event = new Event rawEvent
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should not be deleted", (done) ->
            rawEvent = helpers.getRawEvent()
            eventsReference = [new Event(rawEvent)]
            boundaries =
                start: '2014-06-20T07:00:00.000Z'
                end: '2014-12-20T20:00:00.000Z'

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                should.not.exist err
                should.exist events
                events.length.should.equal 1
                @destroy.callCount.should.equal 0
                done()


    describe "When the event is in range, but still in reference", ->

        before ->
            @sandbox = sinon.sandbox.create()
            rawEvent = helpers.getRawEvent()
            @event = new Event rawEvent
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should not be deleted", (done) ->
            rawEvent = helpers.getRawEvent()
            eventsReference = [new Event(rawEvent)]
            boundaries =
                start: '2015-01-01T07:00:00.000Z'
                end: '2015-07-01T20:00:00.000Z'

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                should.not.exist err
                should.exist events
                events.length.should.equal 1
                @destroy.callCount.should.equal 0
                done()

    describe "When the event is in range, and not in reference", ->

        before ->
            @sandbox = sinon.sandbox.create()

            @notifier = @sandbox.stub Isen.notification, 'createTemporary'
            @notifier.callsArgWithAsync 1, null

            rawEvent = helpers.getRawEvent()
            rawEvent.start = moment().add(1, 'days').toISOString()
            @event = new Event rawEvent
            @event2 = new Event rawEvent
            @event2.id = "Aurion-1514470"
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event, @event2]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should be deleted", (done) ->
            eventsReference = [@event2]
            boundaries =
                start: moment().subtract(2, 'days').toISOString()
                end: moment().add(2, 'days').toISOString()

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                @events = events
                should.not.exist err
                should.exist @events
                @destroy.callCount.should.equal 1
                done()

        it 'and it should not be in the results', ->
            @events.length.should.equal 1

        it "and a notification should be created", ->
            @notifier.callCount.should.equal 1


    describe "When the event is in range but not of calendar ISEN", ->

        before ->
            @sandbox = sinon.sandbox.create()

            @notifier = @sandbox.stub Isen.notification, 'createTemporary'
            @notifier.callsArgWithAsync 1, null

            rawEvent = helpers.getRawEvent()
            @event = new Event rawEvent
            @event.tags = ['some random calendar']
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should not be deleted", (done) ->
            eventsReference = []
            boundaries =
                start: '2015-01-01T07:00:00.000Z'
                end: '2015-07-01T20:00:00.000Z'

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                @events = events
                should.not.exist err
                should.exist @events
                @destroy.callCount.should.equal 0
                done()

        it "should not be in the results", ->
            @events.length.should.equal 0

        it "and no notification should have been created", ->
            @notifier.callCount.should.equal 0


    describe "When the event is in range, of calendar ISEN but not created by Isen's konnector", ->

        before ->
            @sandbox = sinon.sandbox.create()

            @notifier = @sandbox.stub Isen.notification, 'createTemporary'
            @notifier.callsArgWithAsync 1, null

            rawEvent = helpers.getRawEvent()
            @event = new Event rawEvent
            @event.id = 'abcdef1234567890'
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should not be deleted", (done) ->
            eventsReference = []
            boundaries =
                start: '2015-01-01T07:00:00.000Z'
                end: '2015-07-01T20:00:00.000Z'

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                @events = events
                should.not.exist err
                should.exist @events
                @destroy.callCount.should.equal 0
                done()

        it "should not be in the results", ->
            @events.length.should.equal 0

        it "and no notification should have been created", ->
            @notifier.callCount.should.equal 0

    describe "When the event is in range, and not in reference, but before 'now'", ->

        before ->
            @sandbox = sinon.sandbox.create()

            @notifier = @sandbox.stub Isen.notification, 'createTemporary'
            @notifier.callsArgWithAsync 1, null

            rawEvent = helpers.getRawEvent()
            @event = new Event rawEvent
            beforeNow = moment().subtract 1, 'hours'
            @event.start = beforeNow.toISOString()
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should not be deleted", (done) ->
            eventsReference = []
            boundaries =
                start: '2015-01-01T07:00:00.000Z'
                end: '2015-07-01T20:00:00.000Z'

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                @events = events
                should.not.exist err
                should.exist @events
                @destroy.callCount.should.equal 0
                done()

        it "should not be in the results", ->
            @events.length.should.equal 0

        it "and no notification should have been created", ->
            @notifier.callCount.should.equal 0

    describe "When the event is in range, and not in reference, and not in the next two business days", ->

        before ->
            @sandbox = sinon.sandbox.create()

            @notifier = @sandbox.stub Isen.notification, 'createTemporary'
            @notifier.callsArgWithAsync 1, null

            rawEvent = helpers.getRawEvent()
            rawEvent.start = moment().add(9, 'days').toISOString()
            @event = new Event rawEvent
            @event2 = new Event rawEvent
            @event2.id = "Aurion-1514470"
            @stub = @sandbox.stub Event, 'getInRange', (options, callback) =>
                {startKey, endKey} = options
                if startKey <= @event.start <= endKey
                    callback null, [@event, @event2]
                else
                    callback null, []

            @destroy = @sandbox.stub @event, 'destroy'
            @destroy.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "it should be deleted", (done) ->
            eventsReference = [@event2]
            boundaries =
                start: moment().subtract(10, 'days').toISOString()
                end: moment().add(10, 'days').toISOString()

            Isen.checkEventsToDelete eventsReference, boundaries, (err, events) =>
                @events = events
                should.not.exist err
                should.exist @events
                @destroy.callCount.should.equal 1
                done()

        it 'and it should not in the results', ->
            @events.length.should.equal 1

        it "and notification should not be created", ->
            @notifier.callCount.should.equal 0
