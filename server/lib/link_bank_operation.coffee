async = require 'async'
moment = require 'moment'

BankOperation = require '../models/bankoperation'

# Object that will handle all the matching and linking operation depending a
# given model.
# For each given bills, it will compare if a bank operation looks to match it.
# If the amount and date matched, the bill binary is linked to the bank
# operation.
class BankOperationLinker


    constructor: (@model, @log) ->


    link: (entries, callback) ->
        async.eachSeries entries, @linkOperationIfExist, callback

    # For a given entry we look for an operation with same date and same
    # amount.
    linkOperationIfExist: (entry, callback) =>
        date = "#{moment(entry.date).format "YYYY-MM-DDT00:00:00.000"}Z"

        BankOperation.all key: date, (err, operations) =>
            return callback err if err
            @linkRightOperation operations, entry, callback


    # Look for the operation of which amount matches the entry amount
    # If an operation to link is found, we save the binary ID
    # and the file ID as an extra attribute of the operation.
    linkRightOperation: (operations, entry, callback) ->
        operationToLink = null
        try
            amount = parseFloat entry.amount
        catch
            amount = 0

        for operation in operations
            operationAmount = operation.amount
            if operationAmount < 0
                operationAmount = operationAmount * -1
            if amount is operationAmount
                operationToLink = operation

        if not operationToLink?
            callback()
        else if operationToLink.binary is undefined
            @linkOperation operationToLink, entry, callback
        else if not operationToLink.binary.file?
            @linkOperation operationToLink, entry, callback
        else
            callback()


    # Save the binary ID and the file ID as an extra attribute of the
    # operation.
    linkOperation: (operation, entry, callback) =>

        @model.request 'byDate', key: entry.date, (err, entries) =>

            # We ignore error, no need to make fail the import for that.
            # We just log it.
            if err
                @log.raw err
                callback()

            else if entries.length is 0
                callback()

            else
                entry = entries[0]

                operation.setBinaryFromFile entry.fileId, (err) =>

                    if err
                        @log.raw err
                        callback()

                    else
                        @log.debug """
Binary #{operation.binary.file.id} linked with operation:
#{operation.title} - #{operation.amount}
"""


# Procedure that link fetched bills to bank operation contained inside the
# Cozy.
module.exports = (log, model) ->

    (requiredFields, entries, data, next) ->

        linker = new BankOperationLinker model, log

        linker.link entries.fetched, next

