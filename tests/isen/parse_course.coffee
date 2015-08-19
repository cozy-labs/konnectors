should = require 'should'
sinon = require 'sinon'
Isen = require '../../server/konnectors/isen'

describe 'ISEN Konnector - .parseCourse', ->

    describe 'When there is no error during the sub process', ->

        before ->
            @sandbox = sinon.sandbox.create()
            @stub = @sandbox.stub Isen, 'checkFile'
            @stub.callsArgWithAsync 2, null

        after -> @sandbox.restore()

        it "it should not return an error", (done) ->
            courseData =
                'File(s)': [
                    'file1'
                    'file2'
                    'file3'
                ]
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.parseCourse courseData, (err) ->
                should.not.exist err
                done()

        it "the sub function should be called for each file", ->
            @stub.callCount.should.equal 3

    describe 'If there is an error during the sub process', ->

        before ->
            @sandbox = sinon.sandbox.create()
            @stub = @sandbox.stub Isen, 'checkFile'
            @stub.callsArgWithAsync 2, null

            # will trigger an error the second time it's called
            @stub.onCall(1).callsArgWithAsync 2, 'something went wrong'

        after -> @sandbox.restore()

        it "there should not be an error", (done) ->
            courseData =
                'File(s)': [
                    'file1'
                    'file2'
                    'file3'
                ]
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.parseCourse courseData, (err) ->
                should.not.exist err
                done()

        it "the sub function should be called for each file", ->
            @stub.callCount.should.equal 3
