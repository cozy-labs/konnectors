should = require 'should'
moment = require 'moment'
express = require 'express'
fs = require 'fs'

helpers = require './helpers'

File = require '../server/models/file'
Bill = require '../server/models/bill'

log = require('printit')
    prefix: 'test save data and file'

saveDataAndFile = require '../server/lib/save_data_and_file'



describe 'Save Data and File layer', ->

    createdFile = null
    server = null
    params = vendor: 'test'
    layer = saveDataAndFile log, Bill, params, ['bill']

    entries =
            fetched: [
                docType: "Bill",
                date: helpers.getDate("2015-02-01"),
                fileId: "125",
                amount: "20.0",
                type: 'internet'
                pdfurl: "http://localhost:12223/bill.pdf"
            ,
                docType: "Bill",
                date: helpers.getDate("2015-03-21"),
                fileId: "125",
                amount: "20.0",
                type: 'internet'
                pdfurl: "http://localhost:12223/bill.pdf"
            ]

    before (done) ->
        app = express()
        app.use express.static 'tests/files'
        app.use express.static 'files'
        server = app.listen 12223, (err) ->
            done()

    before (done) ->

        map = (doc) ->
            emit doc.date, doc
            return
        Bill.defineRequest 'bydate', map, ->
            map = (doc) ->
                emit "#{doc.path}/#{doc.name}", doc
                return
            File.defineRequest 'byFullPath', map, ->
                map = (doc) ->
                    emit doc._id, doc
                    return
                File.defineRequest 'all', map, ->
                    Bill.requestDestroy 'bydate', (err) ->
                        File.requestDestroy 'byFullPath', (err) ->
                            done()

    after (done) ->
        server.close()
        Bill.requestDestroy 'bydate', (err) ->
            File.requestDestroy 'byFullPath', (err) ->
                done()

    it 'Generate Cozy Files for given links (pdfurl field)', (done) ->
        layer folderPath: 'bills', entries, {}, =>
            File.all (err, files) =>
                should.exist files
                files.length.should.equal 2

                files[0].size.should.equal 64895
                files[1].size.should.equal 64895
                files[0].name.should.equal '201502_test.pdf'
                files[1].name.should.equal '201503_test.pdf'

                @files = files

                done()

    it 'Save bill models', (done) ->
        Bill.all (err, bills) =>
            should.exist bills
            bills.length.should.equal 2

            bills[0].vendor.should.equal 'test'
            bills[0].type.should.equal 'internet'
            bills[0].date.format('YYYY-MM-DD').should.equal '2015-02-01'
            bills[0].fileId.should.equal @files[0].id
            bills[0].binaryId.should.equal @files[0].binary.file.id

            done()

    it 'Download file if entry is there but file is missing', (done) ->
        entries.filtered = []
        @files[0].destroy ->
            layer folderPath: 'bills', entries, {}, =>
                File.all (err, files) =>
                    should.exist files
                    files.length.should.equal 2

                    files[0].size.should.equal 64895
                    files[1].size.should.equal 64895
                    files[0].name.should.equal '201503_test.pdf'
                    files[1].name.should.equal '201502_test.pdf'

                    Bill.all (err, bills) =>
                        bills[0].fileId.should.equal files[1].id
                        binaryId = files[1].binary.file.id
                        bills[0].binaryId.should.equal binaryId
                        done()

