should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'
localization = require '../../server/lib/localization_manager'

helpers = require './helpers'

clone = (object) -> JSON.parse JSON.stringify(object)

describe 'ISEN Konnector - .checkEventsUpdateToNotify', ->

    before ->
        @localization = sinon.stub localization, 't'
        @localization.returns 'notification key'

    after -> @localization.restore()

    beforeEach ->
        @notifier = sinon.stub Isen.notification, 'createTemporary'
        @notifier.callsArgWithAsync 1, null

    afterEach -> @notifier.restore()

    describe "When the event's starting date has not been updated", ->

        before ->
            rawEvent = clone helpers.getRawEvent()
            @event = new Event rawEvent
            @event.beforeUpdate = rawEvent
            fakeNow = moment('2015-06-25T00:00:00.000Z').valueOf()
            @clock = sinon.useFakeTimers fakeNow

        after -> @clock.restore()

        it "notifications should not be updated", (done) ->
            Isen.checkEventsUpdateToNotify @event, =>
                @notifier.callCount.should.equal 0
                done()

    describe "When the event's starting date has been updated to be a given monday", ->

        before ->
            rawEvent = clone helpers.getRawEvent()
            rawEvent.start = '2015-02-13T07:00:00.000Z'
            rawEvent.end = '2015-02-13T10:00:00.000Z'
            @event = new Event rawEvent
            updated = clone rawEvent
            updated.start = '2015-02-09T07:00:00.000Z'
            @event.beforeUpdate = updated

        describe "If the today is a monday", ->
            before ->
                fakeNow = moment('2015-02-02T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a tuesday", ->
            before ->
                fakeNow = moment('2015-02-03T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a wednesday", ->
            before ->
                fakeNow = moment('2015-02-04T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a thursday", ->
            before ->
                fakeNow = moment('2015-02-05T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'


        describe "If the today is a friday", ->
            before ->
                fakeNow = moment('2015-02-06T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'

        describe "If the today is a saturday", ->
            before ->
                fakeNow = moment('2015-02-07T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'

        describe "If the today is a sunday", ->
            before ->
                fakeNow = moment('2015-02-08T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'

    describe "When the event's starting date was a given monday, and has been updated to be a tuesday", ->

        before ->
            rawEvent = clone helpers.getRawEvent()
            rawEvent.start = '2015-02-09T07:00:00.000Z'
            rawEvent.end = '2015-02-09T10:00:00.000Z'
            @event = new Event rawEvent
            updated = clone rawEvent
            updated.start = '2015-02-13T07:00:00.000Z'
            @event.beforeUpdate = updated

        describe "If the today is a monday", ->
            before ->
                fakeNow = moment('2015-02-02T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a tuesday", ->
            before ->
                fakeNow = moment('2015-02-03T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a wednesday", ->
            before ->
                fakeNow = moment('2015-02-04T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should not be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 0
                    done()

        describe "If the today is a thursday", ->
            before ->
                fakeNow = moment('2015-02-05T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'


        describe "If the today is a friday", ->
            before ->
                fakeNow = moment('2015-02-06T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'

        describe "If the today is a saturday", ->
            before ->
                fakeNow = moment('2015-02-07T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'

        describe "If the today is a sunday", ->
            before ->
                fakeNow = moment('2015-02-08T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "notification should be created", (done) ->
                Isen.checkEventsUpdateToNotify @event, =>
                    @notifier.callCount.should.equal 1
                    @params = @notifier.getCall(0).args[0]
                    done()

            it "and the notification should have the correct parameters", ->
                @params.text.should.equal 'notification key'
                @params.resource.app.should.equal 'calendar'
                @params.resource.url.should.equal 'month/2015/2/Aurion-1514469'
