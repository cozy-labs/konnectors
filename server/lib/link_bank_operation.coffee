async = require 'async'

moment = require 'moment'

BankOperation = require '../models/bankoperation'

# Object that will handle all the matching and linking operation depending a
# given model.
# For each given bills, it will compare if a bank operation looks to match it.
# If the amount and date matched, the bill binary is linked to the bank
# operation.
class BankOperationLinker


    constructor: (options) ->
        @log = options.log
        @model = options.model
        if typeof(options.identifier) is 'string'
            @identifier = [options.identifier.toLowerCase()]
        else
            @identifier = options.identifier.map((id) -> id.toLowerCase())
        @amountDelta = options.amountDelta or 0.001
        @dateDelta = options.dateDelta or 15
        @minDateDelta = options.minDateDelta or @dateDelta
        @maxDateDelta = options.maxDateDelta or @dateDelta


    link: (entries, callback) ->
        async.eachSeries entries, @linkOperationIfExist, callback


    # For a given entry we look for an operation with same date and same
    # amount.
    linkOperationIfExist: (entry, callback) =>
        date = new Date (entry.paidDate || entry.date)
        startDate = moment(date).subtract @minDateDelta, 'days'
        endDate = moment(date).add @maxDateDelta, 'days'

        startkey = "#{startDate.format "YYYY-MM-DDT00:00:00.000"}Z"
        endkey = "#{endDate.format "YYYY-MM-DDT00:00:00.000"}Z"

        BankOperation.all {startkey, endkey}, (err, operations) =>
            return callback err if err
            @linkRightOperation operations, entry, callback


    # Look for the operation of which amount matches the entry amount
    # If an operation to link is found, we save the binary ID
    # and the file ID as an extra attribute of the operation.
    linkRightOperation: (operations, entry, callback) ->
        operationToLink = null

        try
            amount = Math.abs parseFloat entry.amount

            # By default, an entry is an expense. If it is not, it should be
            # declared as a refund: isRefund=true.
            amount *= -1 if entry.isRefund? and entry.isRefund
        catch
            callback()
            return

        minAmountDelta = Infinity
        for operation in operations

            opAmount = Math.abs operation.amount

            # By default, an entry is an expense. If it is not, it should be
            # declared as a refund: isRefund=true.
            opAmount *= -1 if entry.isRefund? and entry.isRefund

            amountDelta = Math.abs (opAmount - amount)

            # Select the operation to link based on the minimal amount
            # difference to the expected one and if the label matches one
            # of the possible labels (identifier)
            for identifier in @identifier

                if operation.title.toLowerCase().indexOf(identifier) >= 0 and \
                amountDelta <= @amountDelta and \
                amountDelta <= minAmountDelta
                    operationToLink = operation
                    minAmountDelta = amountDelta
                    break

        if not operationToLink?
            callback()
        else
            @linkOperation operationToLink, entry, callback


    # Save the binary ID and the file ID as an extra attribute of the
    # operation.
    linkOperation: (operation, entry, callback) =>
        date = new Date entry.date
        key = "#{moment(date).format('YYYY-MM-DD')}T00:00:00.000Z"

        @model.request 'byDate', key: key, (err, entries) =>

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

                    else
                        @log.debug """
Binary #{operation.binary.file.id} linked with operation:
#{operation.title} - #{operation.amount}
"""
                    callback()



# Procedure that link fetched bills to bank operation contained inside the
# Cozy.
module.exports = (options) ->

    (requiredFields, entries, data, next) ->

        linker = new BankOperationLinker options
        linker.link entries.fetched, next

