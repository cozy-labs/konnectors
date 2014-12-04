should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
Konnector = require '../server/models/konnector'
poller = require '../server/lib/konnector_poller'

minute = 60 * 1000
hour = 60 * minute
day = 24 * hour
week = 7 * day
month = 30 * day
describe 'Testing konnector poller', ->

    describe 'When calling poller.create with 1 week auto-import..', ->
        before ->
            @sandbox = sinon.sandbox.create useFakeTimers: true
            @spy = @sandbox.spy poller, 'prepareNextCheck'
        after ->
            @sandbox.restore()

        it 'When the cron function is called', ->
            data = new Konnector
                isImporting: false
                importInterval: 'week'
                lastAutoImport: moment().format()
                slug: 'test'
            poller.create(data)
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

    describe 'When calling poller.create with 1 day auto-import..', ->
        before ->
            @sandbox = sinon.sandbox.create useFakeTimers: true
            @spy = @sandbox.spy poller, 'prepareNextCheck'
        after ->
            @sandbox.restore()

        it 'When the cron function is called', ->
            data = new Konnector
                isImporting: false
                importInterval: 'day'
                slug: 'test'
            poller.create(data)
            @spy.callCount.should.equal 1

        it 'Then the cron function should not have been called after 23 hours', ->
            @sandbox.clock.tick 23 * hour
            @spy.callCount.should.equal 1

        it 'But should be called one hour later', ->
            @sandbox.clock.tick 1 * hour
            @spy.callCount.should.equal 2

        it 'And the cron function should have been called again after one more day', ->
            @sandbox.clock.tick 1 * day
            @spy.callCount.should.equal 3

    describe 'When calling poller.create with 1 hour auto-import..', ->
        before ->
            @sandbox = sinon.sandbox.create useFakeTimers: true
            @spy = @sandbox.spy poller, 'prepareNextCheck'
        after ->
            @sandbox.restore()

        it 'When the cron function is called', ->
            data = new Konnector
                isImporting: false
                importInterval: 'hour'
                slug: 'test'
            poller.create(data)
            @spy.callCount.should.equal 1

        it 'Then the cron function should not have been called after 59 minutes', ->
            @sandbox.clock.tick 59 * minute
            @spy.callCount.should.equal 1

        it 'But should be called one minute later', ->
            @sandbox.clock.tick 1 * minute
            @spy.callCount.should.equal 2

        it 'And the cron function should have been called again after one more hour', ->
            @sandbox.clock.tick 1 * hour
            @spy.callCount.should.equal 3

    describe 'When calling poller.create with 1 month auto-import..', ->
        before ->
            @sandbox = sinon.sandbox.create useFakeTimers: true
            @spy = @sandbox.spy poller, 'prepareNextCheck'
        after ->
            @sandbox.restore()

        it 'When the cron function is called', ->
            data = new Konnector
                isImporting: false
                importInterval: 'month'
                slug: 'test'
            poller.create(data)
            @spy.callCount.should.equal 1

        it 'Then the cron function should not have been called after 22 days', ->
            @sandbox.clock.tick 22 * day
            @spy.callCount.should.equal 1

        it 'But should be called one day later', ->
            @sandbox.clock.tick 1 * day
            @spy.callCount.should.equal 2

        it 'And should be called one week later', ->
            @sandbox.clock.tick 1 * week
            @spy.callCount.should.equal 3

        it 'And the cron function should have been called again after one more month', ->
            @sandbox.clock.tick 1 * month
            @spy.callCount.should.equal 5
