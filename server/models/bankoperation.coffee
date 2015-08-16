americano = require 'cozydb'

File = require '../models/file'


module.exports = BankOperation = americano.getModel 'bankoperation',
    bankAccount: String
    title: String
    date: Date
    amount: Number
    raw: String
    dateImport: Date
    categoryId: String
    binary: Object


BankOperation.all = (params, callback) ->
    BankOperation.request "byDate", params, callback


# Set binary of given file (represented by its id) to the current operation
BankOperation::setBinaryFromFile = (fileId, callback) ->

    File.find fileId, (err, file) =>
        return callback err if err

        if file?.binary?.file?
            attributes =
                binary:
                    file: file.binary.file
                    fileName: file.name
                    fileMime: file.mime

            @updateAttributes attributes, (err) =>
                return callback err if err

                @binary =
                    file: file.binary.file
                    fileName: file.name
                    fileMime: file.mime
                callback()

        else
            callback new Error "No binary for this file #{fileId}"

