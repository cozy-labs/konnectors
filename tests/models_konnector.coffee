should = require 'should'
moment = require 'moment'
express = require 'express'
fs = require 'fs'

Konnector = require '../server/models/konnector'
Bill = require '../server/models/bill'
Commit = require '../server/models/commit'
konnectorHash = require '../server/lib/konnector_hash'
createKonnectors = require '../server/init/konnectors'


describe 'Konnector model', ->

    createdFile = null
    server = null
    importDone = false

    konnector = new Konnector
        name: 'Test'
        slug: 'test'
        fieldValues: []
        importInterval: 'week'

    before (done) ->
        app = express()
        server = app.listen 12223, (err) ->
            map = (doc) ->
                emit doc._id, doc
                return
            Konnector.defineRequest 'all', map, ->

                createKonnectors ->
                    konnectorHash['test'] =
                        name: 'Test'
                        slug: 'test'
                        fields:
                            login: 'text'
                            password: 'password'
                        fetch: (values, callback) ->
                            importDone = true
                            callback()
                        models:
                            bills: Bill
                            commits: Commit
                        init: ->

                    done()


    after (done) ->
        server.close()
        if konnector.id?
            konnector.destroy done
        else
            done()


    it 'turn encrypted fields in normal fields', ->
        konnector.password = JSON.stringify password: 'testpass'
        konnector.injectEncryptedFields()
        should.exist konnector.fieldValues.password
        konnector.fieldValues.password.should.equal 'testpass'

    it 'remove encrypted fields from normal fields', ->
        konnector.id = '123'
        konnector.removeEncryptedFields konnectorHash.test.fields
        should.not.exist konnector.fieldValues.password

    it 'updates field values properly', (done) ->
        Konnector.create konnector, (err, newKonnector) ->
            should.not.exist err
            konnector = newKonnector

            data =
                fieldValues:
                    login: 'testlogin'
                    password: 'testpass'

            konnector.updateFieldValues data, (err, konnector) ->

                should.not.exist err
                konnector.password.should.equal '{"password":"testpass"}'
                konnector.fieldValues.login.should.equal 'testlogin'
                should.not.exist konnector.fieldValues.password
                konnector.importInterval.should.equal 'week'

                done()

    it 'run import', (done) ->
        konnector.import ->
            importDone.should.equal true
            should.exist konnector.lastImport
            konnector.isImporting.should.equal false
            done()

    it 'mix model and configuration data', ->
        konnector.appendConfigData()
        should.exist konnector.fields
        should.exist konnector.fields.login
        should.exist konnector.fields.password
        konnector.modelNames.length.should.equal 2
        konnector.modelNames[0].should.equal 'Bill'
        konnector.modelNames[1].should.equal 'Commit'


    it 'build the konnector list to display', (done) ->
        data =
            slug: 'test2'
            fieldValues: []
            importInterval: 'week'

        Konnector.create data, (err, konnector2) ->
            Konnector.getKonnectorsToDisplay (err, konnectors) ->
                should.not.exist err
                konnectors.length.should.equal Object.keys(konnectorHash).length
                konnectors = konnectors.filter (konnector) ->
                    return konnector.slug is 'test'
                konnectors[0].slug.should.equal 'test'
                konnectors[0].fields.login.should.equal 'text'
                konnectors[0].fields.password.should.equal 'password'

                konnector2.destroy ->
                    done()

