fixtures = require 'cozy-fixtures'
should = require 'should'

File = require '../server/models/file'
BankOperation = require '../server/models/bankoperation'


loadFixtures = (callback) ->
    fixtures.load
        dirPath: './tests/fixtures/operations.json'
        doctypeTarget: 'BankOperation'
        silent: true
        removeBeforeLoad: true
        callback: ->
            fixtures.load
                dirPath: './tests/fixtures/files.json'
                doctypeTarget: 'File'
                silent: true
                removeBeforeLoad: true
                callback: ->
                    callback()


describe 'Bank Operation model', ->

    before (done) ->
        loadFixtures done

    it 'grabs binary references of a file from its id', (done) ->

        File.all (err, files) ->
            file = files[0]

            BankOperation.all (err, operations) ->
                operation = operations[0]

                operation.setBinaryFromFile file.id, ->
                    operation.binary.file.id.should.equal file.binary.file.id
                    operation.binary.fileName.should.equal file.name
                    operation.binary.fileMime.should.equal file.mime
                    done()

