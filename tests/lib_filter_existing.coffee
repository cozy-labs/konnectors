fixtures = require 'cozy-fixtures'
should = require 'should'
moment = require 'moment'
cozydb = require 'cozydb'

helpers = require './helpers'

log = require('printit')
    prefix: 'test filter existing'

filterExisting = require '../server/lib/filter_existing'
Bill = require '../server/models/bill'


loadFixtures = (callback) ->
    fixtures.load
        dirPath: './tests/fixtures/bills.json'
        doctypeTarget: 'Bill'
        silent: true
        removeBeforeLoad: true
        callback: callback


describe 'Filter Existing Layer', ->

    entries =
            fetched: [
                docType: "Bill",
                date: helpers.getDate("2015-03-01"),
                fileId: "125",
                amount: "20.0",
            ,
                docType: "Bill",
                date: helpers.getDate("2015-03-21"),
                fileId: "125",
                amount: "20.0",
            ,
                docType: "Bill",
                date: helpers.getDate("2015-03-23"),
                fileId: "125",
                amount: "20.0",
            ,
                docType: "Bill",
                date: helpers.getDate("2015-03-05"),
                fileId: "125",
                amount: "20.0",
        ]

    before (done) ->
        map = (doc) ->
            emit doc.date, doc
            return
        Bill.defineRequest 'bydate', map, ->
            Bill.requestDestroy 'byDate', ->
                loadFixtures done

    after (done) ->
        Bill.requestDestroy 'byDate', done

    it 'removes existing entries without vendor ', (done) ->
        layer = filterExisting log, Bill

        layer {}, entries, {}, ->
            should.exist entries.filtered
            entries.filtered.length.should.equal 1
            done()

    it 'removes existing entries with a vendor ', (done) ->
        layer = filterExisting log, Bill
        for entry in entries.fetched
            entry.vendor = 'test'

        layer {}, entries, {}, ->
           should.exist entries.filtered
           entries.filtered.length.should.equal 2
           done()

