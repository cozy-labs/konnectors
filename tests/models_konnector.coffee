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
    importDone = 0

    konnector = new Konnector
        name: 'Test'
        slug: 'test'
        accounts: [{}]
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
                            importDone++
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
        konnector.password = JSON.stringify [password: 'testpass']
        konnector.injectEncryptedFields()
        should.exist konnector.accounts[0].password
        konnector.accounts[0].password.should.equal 'testpass'

    it 'remove encrypted fields from normal fields', ->
        konnector.removeEncryptedFields konnectorHash.test.fields
        should.not.exist konnector.accounts[0].password

    it.skip 'updates field values properly', (done) ->
        konnector.id = null
        Konnector.create konnector, (err, konnector) ->
            should.not.exist err

            data =
                accounts: [
                    login: 'testlogin'
                    password: 'testpass'
                ]

            konnector.updateFieldValues data, (err, konnector) ->

                should.not.exist err
                konnector.password.should.equal '[{"password":"testpass"}]'
                konnector.accounts[0].login.should.equal 'testlogin'
                should.not.exist konnector.accounts[0].password
                konnector.importInterval.should.equal 'week'

                done()

    it.skip 'run import', (done) ->
        konnector.import ->
            importDone.should.equal 1
            should.exist konnector.lastImport
            konnector.isImporting.should.equal false
            done()

    it.skip 'mix model and configuration data', ->
        konnector.appendConfigData()
        should.exist konnector.fields
        should.exist konnector.fields.login
        should.exist konnector.fields.password
        konnector.modelNames.length.should.equal 2
        konnector.modelNames[0].should.equal 'Bill'
        konnector.modelNames[1].should.equal 'Commit'


    it.skip 'build the konnector list to display', (done) ->
        data =
            slug: 'testList'
            accounts: []
            importInterval: 'week'

        Konnector.create data, (err, konnector2) ->
            should.not.exist err
            konnectorHash[data.slug] = konnector2

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

    it.skip 'run double import', (done) ->
        konnector.accounts.push
            login: 'login2'

        konnector.import ->
            importDone.should.equal 3
            should.exist konnector.lastImport
            konnector.isImporting.should.equal false
            done()

    it.skip 'run triple import', (done) ->
        konnector.accounts.push
            login: 'login3'

        konnector.import ->
            importDone.should.equal 6
            should.exist konnector.lastImport
            konnector.isImporting.should.equal false
            done()

