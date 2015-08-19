should = require 'should'
sinon = require 'sinon'
Isen = require '../../server/konnectors/isen'

describe 'ISEN Konnector - .processFolder', ->

    describe 'When processFolder is called', ->

        before ->
            @sandbox = sinon.sandbox.create()
            @stub = @sandbox.stub Isen, 'checkAndCreateFolder'
            @stub.callsArgWithAsync 2, null

        after -> @sandbox.restore()

        it "it should called 3 times 'checkAndCreateFolder'", (done) ->
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.processFolder courseData, (err) =>
                should.not.exist err

                @stub.callCount.should.equal 3
                @stub.getCall(0).calledWith 'A3', ''
                @stub.getCall(1).calledWith 'CIR', '/A3'
                @stub.getCall(2).calledWith 'RESEAUX', '/A3/CIR'
                done()

    describe "If an error occurs in the subfunction", ->

        before ->
            @sandbox = sinon.sandbox.create()
            @stub = @sandbox.stub Isen, 'checkAndCreateFolder'
            @stub.callsArgWithAsync 2, null

            # will trigger an error the second time it's called
            @stub.onCall(1).callsArgWithAsync 2, 'something went wrong'

        after -> @sandbox.restore()

        it "it should return an error", (done) ->
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.processFolder courseData, (err) =>
                should.exist err
                err.should.equal 'something went wrong'

                @stub.callCount.should.equal 2
                @stub.getCall(0).calledWith 'A3', ''
                @stub.getCall(1).calledWith 'CIR', '/A3'
                done()
