americano = require 'americano-cozy'

File = require '../models/file'


module.exports = BankOperation = americano.getModel 'bankoperation',
    bankAccount: String
    title: String
    date: Date
    amount: Number
    raw: String
    dateImport: Date
    categoryId: String
    appDetails: Object
    binary: (x) -> x


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

            @updateAttributes attributes, (err) =>
                return callback err if err

                @binary =
                    file: file.binary.file
                callback()

        else
            callback new Error "No binary for this file #{fileId}"

# Set binary of given file (represented by its id) to the current operation
BankOperation::setAppDetails = (appDetails, callback) ->
    @updateAttributes appDetails: appDetails, (err) =>
        return callback err if err
        @appUrl = appUrl
        callback()

