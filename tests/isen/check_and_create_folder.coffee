should = require 'should'
sinon = require 'sinon'
Isen = require '../../server/konnectors/isen'
Folder = require '../../server/models/folder'

describe 'ISEN Konnector - .checkAndCreateFolder', ->

    beforeEach ->
        @sandbox = sinon.sandbox.create()

        # Always return the same list of folders
        @allFolders = @sandbox.stub Folder, 'allPath'
        @allFolders.callsArgWithAsync 0, null, ['/A3/CIR']

    afterEach -> @sandbox.restore()

    describe 'When the folder does not exist yet', ->

        before ->
            @sandbox2 = sinon.sandbox.create()
            @stub = @sandbox2.stub Folder, 'createNewFolder'
            @stub.callsArgWithAsync 1, null

        after -> @sandbox2.restore()

        it "there should not be an error", (done) ->
            name = 'RESEAUX'
            path = '/A3/CIR'
            Isen.checkAndCreateFolder name, path, (err) ->
                should.not.exist err
                done()

        it "and a new folder should be created", ->
            @stub.callCount.should.equal 1

    describe 'When the folder already exists', ->

        before ->
            @sandbox2 = sinon.sandbox.create()
            @stub = @sandbox2.stub Folder, 'createNewFolder'
            @stub.callsArgWithAsync 1, null

        after -> @sandbox2.restore()

        it "there should not be an error", (done) ->
            name = 'CIR'
            path = '/A3'
            Isen.checkAndCreateFolder name, path, (err) ->
                should.not.exist err
                done()

        it "but no new folder should be created", ->
            @stub.callCount.should.equal 0

    describe "if an error occurs during folder creation", ->

        before ->
            @sandbox2 = sinon.sandbox.create()
            @stub = @sandbox2.stub Folder, 'createNewFolder'
            @stub.callsArgWithAsync 1, 'something went wrong'

        after -> @sandbox2.restore()

        it "it should return an error", (done) ->
            name = 'RESEAUX'
            path = '/A3/CIR'
            Isen.checkAndCreateFolder name, path, (err) ->
                should.exist err
                err.should.equal 'something went wrong'
                done()
