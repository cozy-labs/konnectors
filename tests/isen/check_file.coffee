should = require 'should'
sinon = require 'sinon'
Isen = require '../../server/konnectors/isen'
File = require '../../server/models/file'

initBefore = ->
    @sandbox = sinon.sandbox.create()

    @deleteFile = @sandbox.stub()
    @deleteFile.callsArgWithAsync 0

    # defines a behaviour to the stub
    # it fakes there is one existing file
    byFullPath = @sandbox.stub File, 'byFullPath', (option, callback) =>
        if option.key is '/A3/CIR/RESEAUX/file1.pdf'
            cozyFile =
                lastModification: "2013-09-02T20:45:11.000Z"
                name: 'file1.pdf'
                path: '/A3/CIR/RESEAUX'
                destroyWithBinary: @deleteFile
            callback null, [cozyFile]
        else
            callback null, []

describe 'ISEN Konnector - .checkFile', ->

    describe "if the file doesn't exist", ->

        before ->
            initBefore.call @
            @createFile = @sandbox.stub Isen, 'createFile'
            @createFile.callsArgWithAsync 5, null

        after -> @sandbox.restore()

        it "there should not be an error", (done) ->
            file =
                dateLastModified: "2013-09-02 20:45:11"
                fileName: 'something.pdf'
                url: 'https://localhost/random/url'
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkFile file, courseData, (err) ->
                should.not.exist err
                done()

        it "and it should be created", ->
            @createFile.callCount.should.equal 1

        it "and the delete process should not have been called", ->
            @deleteFile.callCount.should.equal 0

    describe "if the file already exist and is newer", ->

        before ->
            initBefore.call @
            @createFile = @sandbox.stub Isen, 'createFile'
            @createFile.callsArgWithAsync 5, null

        after -> @sandbox.restore()

        it "there should not be an error", (done) ->
            file =
                dateLastModified: "2013-09-03 10:00:00"
                fileName: 'file1.pdf'
                url: 'https://localhost/random/url/to/file1'
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkFile file, courseData, (err) ->
                should.not.exist err
                done()

        it "and it should be deleted", ->
            @deleteFile.callCount.should.equal 1

        it "and it should be created", ->
            @createFile.callCount.should.equal 1

    describe "if the file already exist and is older", ->

        before ->
            initBefore.call @
            @createFile = @sandbox.stub Isen, 'createFile'
            @createFile.callsArgWithAsync 5, null

        after -> @sandbox.restore()

        it "there should not be an error", (done) ->
            file =
                dateLastModified: "2013-09-01 20:45:11"
                fileName: 'file1.pdf'
                url: 'https://localhost/random/url/to/file1'
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkFile file, courseData, (err) ->
                should.not.exist err
                done()

        it "and it should not be deleted", ->
            @deleteFile.callCount.should.equal 0

        it "and it should not be recreated", ->
            @createFile.callCount.should.equal 0

    describe "if the file is invalid", ->

        describe "'fileName' is missing", ->

            before ->
                initBefore.call @
                @createFile = @sandbox.stub Isen, 'createFile'
                @createFile.callsArgWithAsync 5, null

            after -> @sandbox.restore()

            it "there should be an error", (done) ->
                file =
                    dateLastModified: "2013-09-01 20:45:11"
                    url: 'https://localhost/random/url/to/file1'
                courseData =
                    'File(s)': []
                    'year': 'A3'
                    'course': 'RESEAUX'
                    'curriculum': 'CIR'
                Isen.checkFile file, courseData, (err) ->
                    should.exist err
                    done()

            it "and it should not be created", ->
                @createFile.callCount.should.equal 0

        describe "'dateLastModified' is missing", ->

            before ->
                initBefore.call @
                @createFile = @sandbox.stub Isen, 'createFile'
                @createFile.callsArgWithAsync 5, null

            after -> @sandbox.restore()

            it "there should be an error", (done) ->
                file =
                    fileName: 'file1.pdf'
                    url: 'https://localhost/random/url/to/file1'
                courseData =
                    'File(s)': []
                    'year': 'A3'
                    'course': 'RESEAUX'
                    'curriculum': 'CIR'
                Isen.checkFile file, courseData, (err) ->
                    should.exist err
                    done()

            it "and it should not be created", ->
                @createFile.callCount.should.equal 0

        describe "'url' is missing", ->

            before ->
                initBefore.call @
                @createFile = @sandbox.stub Isen, 'createFile'
                @createFile.callsArgWithAsync 5, null

            after -> @sandbox.restore()

            it "there should be an error", (done) ->
                file =
                    dateLastModified: "2013-09-01 20:45:11"
                    fileName: 'file1.pdf'
                courseData =
                    'File(s)': []
                    'year': 'A3'
                    'course': 'RESEAUX'
                    'curriculum': 'CIR'
                Isen.checkFile file, courseData, (err) ->
                    should.exist err
                    done()

            it "and it should not be created", ->
                @createFile.callCount.should.equal 0
