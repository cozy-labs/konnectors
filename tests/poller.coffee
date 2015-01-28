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
    after (done) ->
        Konnector.all (err, body) =>
            for konnector in body
                if konnector.slug is 'free'
                    konnector.destroy()
                    done()

    describe "Initialize of suto import", ->

        describe 'When calling poller.create with 1 week auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
                @spy2 = @sandbox.spy poller, 'prepareNextCheck'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                data = new Konnector
                    isImporting: false
                    importInterval: 'week'
                    lastAutoImport: moment().format()
                    slug: 'free'
                data.save (err, res, body) =>
                    poller.start false, () =>
                        @spy.callCount.should.equal 0
                        done()

            it 'Then the cron function should not have been called after 6 days', (done) ->
                @sandbox.clock.tick 6 * day
                @spy.callCount.should.equal 0
                done()

            it 'But should be called one day later', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more week', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 day auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body
                        if konnector.slug is 'free'
                            konnector.importInterval = 'day'
                            konnector.lastAutoImport = moment().format()
                            konnector.save (err, res, body) =>
                                poller.start true, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 23 hours', ->
                @sandbox.clock.tick 23 * hour
                @spy.callCount.should.equal 0

            it 'But should be called one hour later', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more day', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 hour auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body
                        if konnector.slug is 'free'
                            konnector.importInterval = 'hour'
                            konnector.lastAutoImport = moment().format()
                            konnector.save (err, res, body) =>
                                poller.start true, () =>
                                    @spy.callCount.should.equal 0
                                    done()


            it 'Then the cron function should not have been called after 59 minutes', ->
                @sandbox.clock.tick 59 * minute
                @spy.callCount.should.equal 0

            it 'But should be called one minute later', ->
                @sandbox.clock.tick 1 * minute
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more hour', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 month auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body
                        if konnector.slug is 'free'
                            konnector.importInterval = 'month'
                            konnector.lastAutoImport = moment().format()
                            konnector.save (err, res, body) =>
                                poller.start true, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 22 days', ->
                @sandbox.clock.tick 22 * day
                @spy.callCount.should.equal 0

            it 'But should be called one day later', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 0

            it 'And should be called one week later', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more month', ->
                @sandbox.clock.tick 1 * month
                @spy.callCount.should.equal 2


    describe "Add/Modify konnector with auto import", ->

        describe 'When calling poller.create with 1 week auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
                @spy2 = @sandbox.spy poller, 'prepareNextCheck'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body
                            if konnector.slug is 'free'
                                konnector.importInterval = 'week'
                                konnector.lastAutoImport = moment().format()
                                konnector.fieldValues = {}
                                poller.handleTimeout konnector, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 6 days', (done) ->
                @sandbox.clock.tick 6 * day
                @spy.callCount.should.equal 0
                done()

            it 'But should be called one day later', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more week', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 day auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body
                            if konnector.slug is 'free'
                                konnector.importInterval = 'day'
                                konnector.lastAutoImport = moment().format()
                                konnector.fieldValues = {}
                                poller.handleTimeout konnector, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 23 hours', ->
                @sandbox.clock.tick 23 * hour
                @spy.callCount.should.equal 0

            it 'But should be called one hour later', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more day', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 hour auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body
                            if konnector.slug is 'free'
                                konnector.importInterval = 'hour'
                                konnector.lastAutoImport = moment().format()
                                konnector.fieldValues = {}
                                poller.handleTimeout konnector, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 59 minutes', ->
                @sandbox.clock.tick 59 * minute
                @spy.callCount.should.equal 0

            it 'But should be called one minute later', ->
                @sandbox.clock.tick 1 * minute
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more hour', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 2

        describe 'When calling poller.create with 1 month auto-import..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body
                            if konnector.slug is 'free'
                                konnector.importInterval = 'month'
                                konnector.lastAutoImport = moment().format()
                                konnector.fieldValues = {}
                                poller.handleTimeout konnector, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 22 days', ->
                @sandbox.clock.tick 22 * day
                @spy.callCount.should.equal 0

            it 'But should be called one day later', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 0

            it 'And should be called one week later', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more month', ->
                @sandbox.clock.tick 1 * month
                @spy.callCount.should.equal 2


    describe "Initialize a auto import with a start date", ->

        describe 'When calling poller.handleTimeout with 1 week auto-import and start in one month..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body
                            if konnector.slug is 'free'
                                konnector.importInterval = 'week'
                                konnector.lastAutoImport = moment().format()
                                konnector.fieldValues = {date: moment().add month, 'ms'}
                                poller.handleTimeout konnector, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 7 days', (done) ->
                @sandbox.clock.tick 7 * day
                @spy.callCount.should.equal 0
                done()


            it 'Then the cron function should not have been called after 14 days', (done) ->
                @sandbox.clock.tick 14 * day
                @spy.callCount.should.equal 0
                done()

            it 'But should be called 14 day later', ->
                @sandbox.clock.tick 14 * day
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more week', ->
                @sandbox.clock.tick 7 * day
                @spy.callCount.should.equal 2


    describe "Modify a auto import with a start date", ->

        describe 'When calling poller.handleTimeout with 1 week auto-import and start in one month..', ->
            before ->
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy poller, 'checkImport'
            after ->
                @sandbox.restore()

            it 'When the cron function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body
                        if konnector.slug is 'free'
                            konnector.importInterval = 'week'
                            konnector.lastAutoImport = moment().add month, 'ms'
                            konnector.save (err, res, body) =>
                                poller.start true, () =>
                                    @spy.callCount.should.equal 0
                                    done()

            it 'Then the cron function should not have been called after 7 days', (done) ->
                @sandbox.clock.tick 7 * day
                @spy.callCount.should.equal 0
                done()


            it 'Then the cron function should not have been called after 14 days', (done) ->
                @sandbox.clock.tick 14 * day
                @spy.callCount.should.equal 0
                done()

            it 'But should be called 14 day later', ->
                @sandbox.clock.tick 14 * day
                @spy.callCount.should.equal 1

            it 'And the cron function should have been called again after one more week', ->
                @sandbox.clock.tick 7 * day
                @spy.callCount.should.equal 2
