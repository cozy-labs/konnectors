should = require 'should'
moment = require 'moment'
express = require 'express'
fs = require 'fs'

File = require '../server/models/file'


describe 'File model', ->

    createdFile = null
    server = null

    before (done) ->
        app = express()
        app.use express.static 'tests/files'
        app.use express.static 'files'
        server = app.listen 12223, (err) ->
            done()

    after (done) ->
        server.close()
        if createdFile?
            createdFile.destroy done
        else
            done()

    it 'Can create a Cozy File from a given pdf url', (done) ->
        @timeout 5000

        fileName = 'bill.pdf'
        path = "/bills"
        date = moment()
        url = 'http://localhost:12223/bill.pdf'
        tags = ["bill"]

        File.createNew fileName, path, url, tags, (err, file) ->
            should.exist file
            createdFile = file
            file.name.should.equal fileName
            file.path.should.equal path
            file.tags.length.should.equal 1
            file.tags[0].should.equal "bill"

            stream = file.getBinary 'file', (err) ->
                originalContent = fs.readFileSync './tests/files/bill.pdf'
                testContent = fs.readFileSync('/tmp/test-bill.pdf')
                testContent.toString().should.equal originalContent.toString()
                done()

            stream.pipe fs.createWriteStream '/tmp/test-bill.pdf'


    it 'Can tell if a file is present in Cozy Files', (done) ->

        File.isPresent '/bills/bill.pdf', (err, isPresent) ->
            should.not.exist err
            isPresent.should.equal true

            File.isPresent '/bills/billa.pdf', (err, isPresent) ->
                should.not.exist err
                isPresent.should.equal false
                done()

