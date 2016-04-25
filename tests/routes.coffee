should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
Konnector = require '../server/models/konnector'
free = require '../server/konnectors/free'
RealtimeAdapter = require 'cozy-realtime-adapter'
helpers = require './helpers'

minute = 60 * 1000
hour = 60 * minute
day = 24 * hour
week = 7 * day
month = 30 * day
client = ''
app = ''
format = "DD/MM/YYYY"

describe.skip 'Testing konnector controller', ->

    describe "Import", ->
        before ->
            client = helpers.getClient()

        describe 'Import konnector without autoimport', ->
            before (done) ->
                @timeout 4000
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy free, 'fetch'
                Konnector.defineRequest 'all', (doc) ->
                    return emit(doc._id, doc);
                , (err) ->
                    helpers.startApp (appli)->
                        app = appli
                        done()

            after (done) ->
                @sandbox.restore()
                helpers.stopApp () ->
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.destroy()
                            done()

            it 'When the import function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        konnector.accounts = [
                            login: "test"
                            password: "password"
                            folderPath: ""
                        ]
                        konnector.date = ''
                        konnector.importInterval = 'none'
                        konnector.password = '[{"password": "password"}]'
                        @id = konnector.id
                        client.put "konnectors/#{konnector.id}", konnector, (err, res, body) =>
                            @body = body
                            done()

            it 'Then konnector state should be updating', (done) ->
                @timeout 6000
                count = 0
                realtime = RealtimeAdapter app.server, 'konnector.*'

                realtime.on 'konnector.update', (event, id) =>
                    count += 1
                    Konnector.find id, (err, body) =>
                        if count is 1
                            if body.isImporting is false
                                count = 0
                            else
                                # Without that fetch doesn't start.
                                @sandbox.clock.tick 1 * minute
                        else if count is 2
                            body.isImporting.should.equal false
                            done() if done?
                            done = null

            it "And body should be 'OK'", ->
                @body.should.equal 'OK'

            it 'And the fetch function should have been called one time', ->
                @spy.callCount.should.equal 1

            it "And errorMessage should be updated (bad credentials)", (done) ->
                Konnector.find @id, (err, body) =>
                    should.exist body.errorMessage
                    body.errorMessage.should.equal 'bad credentials'
                    done()


        describe 'Import konnector with autoimport', ->
            before (done) ->
                @timeout 4000
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy free, 'fetch'
                Konnector.defineRequest 'all', (doc) ->
                    return emit(doc._id, doc);
               , (err) ->
                    helpers.startApp (appli)->
                        app = appli
                        done()

            after (done) ->
                @sandbox.restore()
                helpers.stopApp () ->
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.destroy()
                            done()

            it 'When import function is called', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        konnector.accounts = [
                            login: "test"
                            password: "password"
                            folderPath: ""
                        ]
                        konnector.date = ''
                        konnector.importInterval = 'day'
                        konnector.password = '[{"password": "password"}]'
                        @id = konnector.id
                        client.put "konnectors/#{konnector.id}", konnector, (err, res, body) =>
                            @body = body
                            done()

            it 'Then konnector state should be updating', (done) ->
                @timeout 6000
                count = 0
                realtime = RealtimeAdapter app.server, 'konnector.*'

                realtime.on 'konnector.update', (event, id) =>
                    count += 1
                    Konnector.find id, (err, body) =>
                        if count is 1
                            if body.isImporting is false
                                count = 0
                            else
                                # Without that fetch doesn't start.
                                @sandbox.clock.tick 1 * minute
                        else if count is 2
                            body.isImporting.should.equal false
                            done() if done?
                            done = null

            it "And body should be 'OK'", ->
                @body.should.equal 'OK'

            it 'And the fetch function should have been called one time', ->
                @spy.callCount.should.equal 1

            it "And errorMessage should be updated (bad credentials)", (done) ->
                Konnector.find @id, (err, body) =>
                    @body = body
                    should.exist body.errorMessage
                    body.errorMessage.should.equal 'bad credentials'
                    done()

            it "And importInterval should be updated", ->
                should.exist @body.importInterval
                @body.importInterval.should.equal 'day'

            it "And lastAutoImport should be updated", ->
                should.exist @body.lastAutoImport
                lastAutoImport = moment(@body.lastAutoImport)
                lastAutoImport.format(format).should.equal '01/01/1970'

            it 'Then the fetch function should have been called after a day', (done) ->
                @timeout 6000
                @sandbox.clock.tick 1 * day
                count = 0
                realtime = RealtimeAdapter app.server, 'konnector.*'

                realtime.on 'konnector.update', (event, id) =>
                    count += 1
                    Konnector.find id, (err, body) =>
                        if count is 1
                            if body.isImporting is false
                                count = 0
                            else
                                # Without that fetch doesn't start.
                                @sandbox.clock.tick 1 * minute
                        else if count is 2
                            body.isImporting.should.equal false
                            done() if done?
                            done = null

            it 'Then the fetch function should have been called after a day', ->
                @spy.callCount.should.equal 2

            it "And lastAutoImport should be updated", (done) ->
                Konnector.find @id, (err, body) =>
                    # Retry once to be sure to have the last konnector version
                    Konnector.find @id, (err, body) =>
                        should.exist body.lastAutoImport
                        lastAutoImport = moment(body.lastAutoImport)
                        lastAutoImport.format(format).should.equal '02/01/1970'
                        done()


        describe 'Import konnector with autoimport and start date', ->
            before (done) ->
                @timeout 4000
                @sandbox = sinon.sandbox.create useFakeTimers: true
                @spy = @sandbox.spy free, 'fetch'
                Konnector.defineRequest 'all', (doc) ->
                    return emit(doc._id, doc);
                , (err) ->
                    helpers.startApp (appli)->
                        app = appli
                        done()

            after (done) ->
                @sandbox.restore()
                helpers.stopApp () ->
                    Konnector.all (err, body) =>
                        for konnector in body when konnector.slug is 'free'
                            konnector.destroy()
                            done()


            it 'When the konnector is created', (done) ->
                Konnector.all (err, body) =>
                    for konnector in body when konnector.slug is 'free'
                        konnector.accounts = [
                            login: "test"
                            password: "password"
                            folderPath: ""
                        ]
                        konnector.date "03/01/1970"
                        konnector.importInterval = 'day'
                        konnector.password = '{"password": "password"}'
                        @id = konnector.id
                        client.put "konnectors/#{konnector.id}", konnector, (err, res, body) =>
                            @body = body
                            done()

            it "And body should be 'OK'", ->
                @body.should.equal 'OK'

            it "And konnector should be update", (done) ->
                # Wait and of handleTimeout function
                checkKonnector = () =>
                    Konnector.find @id, (err, body) ->
                        if not err? and body.lastAutoImport?
                            done()
                        else
                            checkKonnector()
                checkKonnector()

            it 'And lastAutoImport should be equal to start date', (done) ->
                Konnector.find @id, (err, body) ->
                    body.lastAutoImport.format(format).should.equal "03/01/1970"
                    done()

            it 'And the fetch function should not have been called time', ->
                @spy.callCount.should.equal 0

            it 'Then the fetch function should not have been called after a day', (done) ->
                @sandbox.clock.tick 1 * day
                @spy.callCount.should.equal 0
                done()

            it 'Then the fetch function should have been called after the start date', (done) ->
                @timeout 6000
                @sandbox.clock.tick 1 * day
                count = 0
                realtime = RealtimeAdapter app.server, 'konnector.*'

                realtime.on 'konnector.update', (event, id) =>
                    count += 1
                    Konnector.find id, (err, body) =>
                        if count is 1
                            if body.isImporting is false
                                count = 0
                            else
                                # Without that fetch doesn't start.
                                @sandbox.clock.tick 1 * minute
                        else if count is 2
                            body.isImporting.should.equal false
                            done() if done?
                            done = null

            it "And lastAutoImport should be updated", (done) ->
                Konnector.find @id, (err, body) =>
                    should.exist body.lastAutoImport
                    lastAutoImport = moment(body.lastAutoImport)
                    lastAutoImport.format(format).should.equal '03/01/1970'
                    done()

            it 'Then the fetch function have been called after the one day', (done) ->
                @timeout 6000
                @sandbox.clock.tick 1 * day
                count = 0
                realtime = RealtimeAdapter app.server, 'konnector.*'

                realtime.on 'konnector.update', (event, id) =>
                    count += 1
                    Konnector.find id, (err, body) =>
                        if count is 1
                            if body.isImporting is false
                                count = 0
                            else
                                # Without that fetch doesn't start.
                                @sandbox.clock.tick 1 * minute
                        else
                            body.isImporting.should.equal false
                            done() if done?
                            done = null

            it 'Then the fetch function should have been called after a day', ->
                @spy.callCount.should.equal 2

            it "And lastAutoImport should be updated", (done) ->
                Konnector.find @id, (err, body) =>
                    should.exist body.lastAutoImport
                    lastAutoImport = moment(body.lastAutoImport)
                    lastAutoImport.format(format).should.equal '04/01/1970'
                    done()

