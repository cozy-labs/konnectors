should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
async = require 'async'

Konnector = require '../server/models/konnector'
poller = require '../server/lib/poller'
konnectorHash = require '../server/lib/konnector_hash'
helpers = require './helpers'

minute = 60 * 1000
hour = 60 * minute
day = 24 * hour
week = 7 * day
month = 30 * day


describe.skip 'Testing konnector poller', ->

    before (done) ->
        @timeout 4000
        Konnector.defineRequest 'all', (doc) ->
            return emit(doc._id, doc)
        , (err) ->
            done()

    after (done) ->
        helpers.clearKonnector 'free', done


    describe "Start polling", ->

        describe 'Import every week', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'setup crons', (done) ->
                @timeout 4000
                konnector =
                    isImporting: false
                    importInterval: 'week'
                    lastAutoImport: moment().format()
                    slug: 'free'

                konnectorHash[konnector.slug] = konnector

                Konnector.create konnector, (err, konnector) =>
                    poller.start false, =>
                        @spy.callCount.should.equal 0
                        done()

            it 'Import should not be runned after 3 days', (done) ->
                @sandbox.clock.tick 3 * day
                @spy.callCount.should.equal 0
                done()

            it 'should be called after one week', ->
                @sandbox.clock.tick 4 * day
                @spy.callCount.should.equal 1

            it 'should be called again after two weeks', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 2


        describe 'Import every day', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        data =
                            importInterval: 'day'
                            lastAutoImport: moment().format()
                        konnector.updateAttributes data, (err) =>
                            poller.start true, () =>
                                @spy.callCount.should.equal 0
                                done()

            # Doest not handle properly the timezone.
            it 'Import should not be called after 20 hours', ->
                @sandbox.clock.tick 20 * hour
                @spy.callCount.should.equal 0

            it 'Import should be called after one day', ->
                @sandbox.clock.tick 4 * hour
                @spy.callCount.should.equal 1

            it 'Import should be called again after two days', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 2


        describe 'Import every hour', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        data =
                            importInterval: 'hour'
                            lastAutoImport: moment().format()
                        konnector.updateAttributes data, (err) =>
                            poller.start true, () =>
                                @spy.callCount.should.equal 0
                                done()

            it 'Import should not be called after 40 minutes', ->
                @sandbox.clock.tick 40 * minute
                @spy.callCount.should.equal 0

            it 'Import should be called after one hour', ->
                @sandbox.clock.tick 20 * minute
                @spy.callCount.should.equal 1

            it 'Import should be called again after two hours', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 2


        describe 'Import every month', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        data =
                            importInterval: 'month'
                            lastAutoImport: moment().format()
                        konnector.updateAttributes data, (err) =>
                            poller.start true, () =>
                                @spy.callCount.should.equal 0
                                done()

            it 'Import should not be called after 12 days', ->
                @sandbox.clock.tick 12 * day
                @spy.callCount.should.equal 0

            it 'Import should be called after one month', ->
                @sandbox.clock.tick 20 * day
                @spy.callCount.should.equal 1

            it 'And should be called after two months', ->
                @sandbox.clock.tick 1 * month
                @spy.callCount.should.equal 2


    describe "Start polling then add/modify a konnector", ->

        describe 'Import every week', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.importInterval = 'week'
                            konnector.lastAutoImport = moment().format()
                            konnector.accounts = [{}]
                            poller.add null, konnector, () =>
                                @spy.callCount.should.equal 0
                                done()

            it 'Import should not be runned after 5 days', (done) ->
                @sandbox.clock.tick 5 * day
                @spy.callCount.should.equal 0
                done()

            it 'should be called after one week', ->
                @sandbox.clock.tick 2 * day
                @spy.callCount.should.equal 1

            it 'should be called again after two weeks', ->
                @sandbox.clock.tick 1 * week
                @spy.callCount.should.equal 2


        describe 'Import every day', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.importInterval = 'day'
                            konnector.lastAutoImport = moment().format()
                            konnector.accounts = [{}]
                            poller.add null, konnector, () =>
                                @spy.callCount.should.equal 0
                                done()

            # Doest not handle properly the timezone.
            it 'Import should not be called after 20 hours', ->
                @sandbox.clock.tick 20 * hour
                @spy.callCount.should.equal 0

            it 'Import should be called after one day', ->
                @sandbox.clock.tick 4 * hour
                @spy.callCount.should.equal 1

            it 'Import should be called again after two days', ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 2


        describe 'Import every hour', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.importInterval = 'hour'
                            konnector.lastAutoImport = moment().format()
                            konnector.accounts = [{}]
                            poller.add null, konnector, () =>
                                @spy.callCount.should.equal 0
                                done()

            it 'Import should not be called after 40 minutes', ->
                @sandbox.clock.tick 40 * minute
                @spy.callCount.should.equal 0

            it 'Import should be called after one hour', ->
                @sandbox.clock.tick 20 * minute
                @spy.callCount.should.equal 1

            it 'Import should be called again after two hours', ->
                @sandbox.clock.tick 1 * hour
                @spy.callCount.should.equal 2


        describe 'Import every month', ->

            before ->
                @sandbox = sinon.sandbox.create()
                @sandbox.useFakeTimers(new Date().valueOf())
                @spy = @sandbox.spy poller, 'runImport'

            after ->
                @sandbox.restore()

            it 'Setup crons', (done) ->
                @timeout 4000
                poller.start true, ()=>
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.importInterval = 'month'
                            konnector.lastAutoImport = moment().format()
                            konnector.accounts = [{}]
                            poller.add null, konnector, () =>
                                @spy.callCount.should.equal 0
                                done()

            it 'Import should not be called after 12 days', ->
                @sandbox.clock.tick 12 * day
                @spy.callCount.should.equal 0

            it 'Import should be called after one month', ->
                @sandbox.clock.tick 20 * day
                @spy.callCount.should.equal 1

            it 'And should be called after two months', ->
                @sandbox.clock.tick 1 * month
                @spy.callCount.should.equal 2

###
