
should = require 'should'
sinon = require 'sinon'
Konnector = require '../server/models/konnector'
poller = require '../server/lib/konnector_poller'

describe 'Testing konnector poller', ->

    it 'When the cron function is called', ->
        poller.start()
        @sandbox = sinon.sandbox.create()
        @clock = @sandbox.useFakeTimers()
        @stub = @sandbox.stub poller, 'prepareNextCheck'

    it 'Then the cron function should not have been called before one week', ->
        @clock.tick 1000 * 60 * 60 * 24 * 6
        @stub.calledOnce.should.be.true

    it 'And the cron function should have been called only once after one week', ->
        @clock.tick 1000 * 60 * 60 * 24 * 7
        @stub.calledTwice.should.be.true
