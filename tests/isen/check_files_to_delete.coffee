should = require 'should'
sinon = require 'sinon'
Isen = require '../../server/konnectors/isen'
File = require '../../server/models/file'

courseData =
    'File(s)': [
        {fileName: 'file1.pdf'}
        {fileName: 'file2.pdf'}
        {fileName: 'file3.pdf'}
    ]
    'year': 'A3'
    'course': 'RESEAUX'
    'curriculum': 'CIR'

describe 'ISEN Konnector - .checkFilesToDelete', ->

    describe "When all files are in reference", ->

        before ->
            @sandbox = sinon.sandbox.create()

            request = @sandbox.stub File, 'byFolder'
            rawFile =
                path: 'A3/CIR/RESEAUX'
                name: 'file1.pdf'
            modelFile = new File rawFile
            request.callsArgWithAsync 1, null, [modelFile]

            @stub = @sandbox.stub modelFile, 'destroyWithBinary'
            @stub.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "delete should not be called", (done) ->
            Isen.checkFilesToDelete courseData, (err) =>
                should.not.exist err
                @stub.callCount.should.equal 0
                done()

    describe "When there is a file not in reference", ->

        before ->
            @sandbox = sinon.sandbox.create()

            request = @sandbox.stub File, 'byFolder'
            rawFile =
                path: 'A3/CIR/RESEAUX'
                name: 'file4.pdf'
            modelFile = new File rawFile
            request.callsArgWithAsync 1, null, [modelFile]

            @stub = @sandbox.stub modelFile, 'destroyWithBinary'
            @stub.callsArgWithAsync 0, null

        after -> @sandbox.restore()

        it "delete should be called", (done) ->
            Isen.checkFilesToDelete courseData, (err) =>
                should.not.exist err
                @stub.callCount.should.equal 1
                done()
