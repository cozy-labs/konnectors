should = require 'should'
Isen = require '../../server/konnectors/isen'

describe 'ISEN Konnector - .checkKeys', ->

    describe "When course data have all mandatory fields", ->

        it "there should not be an error", (done) ->
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkKeys courseData, (err) ->
                should.not.exist err
                done()

    describe "When 'course' is missing from course data", ->

        it "there should be an error", (done) ->
            courseData =
                'File(s)': []
                'year': 'A3'
                'curriculum': 'CIR'
            Isen.checkKeys courseData, (err) ->
                should.exist err
                done()

    describe "When 'year' is missing from course data", ->

        it "there should be an error", (done) ->
            courseData =
                'File(s)': []
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkKeys courseData, (err) ->
                should.exist err
                done()

    describe "When 'curriculum' is missing from course data", ->

        it "there should be an error", (done) ->
            courseData =
                'File(s)': []
                'year': 'A3'
                'course': 'RESEAUX'
            Isen.checkKeys courseData, (err) ->
                should.exist err
                done()

    describe "When 'File(s)' is missing from course data", ->

        it "there should be an error", (done) ->
            courseData =
                'year': 'A3'
                'course': 'RESEAUX'
                'curriculum': 'CIR'
            Isen.checkKeys courseData, (err) ->
                should.exist err
                done()
