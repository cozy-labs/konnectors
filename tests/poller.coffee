should = require 'should'
sinon = require 'sinon'
Konnector = require '../server/models/konnector'
poller = require '../server/lib/konnector_poller'

hour = 60 * 60 * 1000
day = 24 * hour
week = 7 * day

describe 'Testing konnector poller', ->
    before ->
        @sandbox = sinon.sandbox.create useFakeTimers: true
        @spy = @sandbox.spy poller, 'prepareNextCheck'
    after ->
        @sandbox.restore()

    it 'When the cron function is called', ->
        poller.start()
        @spy.callCount.should.equal 1

    it 'Then the cron function should not have been called after 6 days', ->
        @sandbox.clock.tick 6 * day
        @spy.callCount.should.equal 1

    it 'But should be called one day later', ->
        @sandbox.clock.tick 1 * day
        @spy.callCount.should.equal 2

    it 'And the cron function should have been called again after one more week', ->
        @sandbox.clock.tick 1 * week
        @spy.callCount.should.equal 3
