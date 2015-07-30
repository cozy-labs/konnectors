nock = require 'nock'
should = require 'should'
Isen = require '../../server/konnectors/isen'
helpers = require './helpers'

nockOptions = allowUnmocked: true

baseUrl = 'https://web.isen-bretagne.fr'
courseDataUrl = '/cc/jsonFileList/A3.CIR.DESIGN_PATTERNS'

RESOURCE_URL = "#{baseUrl}#{courseDataUrl}"

describe 'ISEN Konnector - .fetchJson', ->

    describe "When the URL is valid and JSON in response is valid", ->

        before ->
            nock baseUrl, nockOptions
                .persist()
                .defaultReplyHeaders {'content-type': 'application/json; charset=utf-8'}
                .get courseDataUrl
                .reply 200, helpers.getCourseDataFixture()

        after -> nock.cleanAll()

        it "it should return course data", (done) ->
            Isen.fetchJson RESOURCE_URL, (err, courseData) ->
                should.not.exist err
                should.exist courseData
                courseData.should.have.property 'year', 'A3'
                courseData.should.have.property 'curriculum', 'CIR'
                courseData.should.have.property 'course', 'RESEAUX'
                courseData.should.have.property 'File(s)'
                courseData['File(s)'].length.should.equal 49
                done()

    describe "When the URL is invalid", ->

        before ->
            nock baseUrl, nockOptions
                .log console.log
                .persist()
                .defaultReplyHeaders {'content-type': 'application/json; charset=utf-8'}
                .get "#{courseDataUrl}456"
                .reply 404, "Not found"

        after -> nock.cleanAll()

        it "it should return an error", (done) ->
            Isen.fetchJson "#{courseDataUrl}456", (err, courseData) ->
                should.exist err
                should.not.exist courseData
                done()

    describe "When the JSON in response is invalid", ->

        before ->
            nock baseUrl, nockOptions
                .log console.log
                .persist()
                .defaultReplyHeaders {'content-type': 'application/json; charset=utf-8'}
                .get courseDataUrl
                .reply 200, '{invalid json}'

        after -> nock.cleanAll()

        it "should return an error", (done) ->
            Isen.fetchJson courseDataUrl, (err, courseData) ->
                should.exist err
                should.not.exist courseData
                done()


    describe "When the server is unavailable", ->

        before ->
            nock baseUrl, nockOptions
                .get "/cc/PublishVCalendar/richard.stallman.ics"
                .reply 503, "Service Unavailable"

        after -> nock.cleanAll()

        it "it should return an error", (done) ->
            fields =
                email: "richard.stallman@something.fr"
            Isen.fetch fields, (err, ics) ->
                should.exist err
                should.equal err, "server unavailable, please try again later"
                should.not.exist ics
                done()
