async = require 'async'

moment = require 'moment'

BankOperation = require '../models/bankoperation'

log = require('printit')
    prefix: "BankOpEDF"
    date: true


# Object that will handle all the matching and linking operation depending a
# given model.
# For each given bills, it will compare if a bank operation looks to match it.
# If the amount and date matched, the bill binary is linked to the bank
# operation.
class BankOperationLinker


    constructor: (options) ->
        @log = options.log
        @model = options.model
        @identifier = options.identifier.toLowerCase()
        @amountDelta = options.amountDelta or 0
        @minAmountDelta = options.minAmountDelta or @amountDelta
        @maxAmountDelta = options.maxAmountDelta or @amountDelta
        @dateDelta = options.dateDelta or 15
        @minDateDelta = options.minDateDelta or @dateDelta
        @maxDateDelta = options.maxDateDelta or @dateDelta


    link: (entries, callback) ->
        log.info "link"
        async.eachSeries entries, @linkOperationIfExist, callback


    # For a given entry we look for an operation with same date and same
    # amount.
    linkOperationIfExist: (entry, callback) =>
        log.info entry.receiptDate
        startDate = moment(entry.receiptDate).subtract @minDateDelta, 'days'
        endDate = moment(entry.receiptDate).add @maxDateDelta, 'days'
        startkey = "#{startDate.format "YYYY-MM-DDT00:00:00.000"}Z"
        endkey = "#{endDate.format "YYYY-MM-DDT00:00:00.000"}Z"
        log.info "linkOperationIfExist #{startkey} -> #{endkey}"

        BankOperation.all {startkey, endkey}, (err, operations) =>
            return callback err if err
            log.info operations
            @linkRightOperation operations, entry, callback


    # Look for the operation of which amount matches the entry amount
    # If an operation to link is found, we save the binary ID
    # and the file ID as an extra attribute of the operation.
    linkRightOperation: (operations, entry, callback) ->
        log.info "linkRightOperation"
        operationToLink = null
        try
            amount = parseFloat entry.amount
        catch
            amount = 0

        for operation in operations
            operationAmount = operation.amount
            if operationAmount < 0
                operationAmount = operationAmount * -1

            if operation.title.toLowerCase().indexOf(@identifier) >= 0 and \
            (amount - @minAmountDelta) <= operationAmount and \
            (amount + @maxAmountDelta) >= operationAmount
                operationToLink = operation

        if not operationToLink?
            log.info "not operationToLink?"
            callback()
        else if operationToLink.appDetails is undefined
            log.info "operationToLink.appDetails is undefined"
            @linkOperation operationToLink, entry, callback
        else
            log.info "else"
            callback()


    # Save the binary ID and the file ID as an extra attribute of the
    # operation.
    linkOperation: (operation, entry, callback) =>
        log.info "linkRightOperation #{entry.receiptDate}"

        @model.request 'byDate', key: entry.receiptDate, (err, entries) =>

            # We ignore error, no need to make fail the import for that.
            # We just log it.
            if err
                @log.raw err
                callback()

            else if entries.length is 0
                log.info "entries.length is 0"
                callback()

            else
                entry = entries[0]
                log.info entry
                appDetails =
                    url : "/#apps/edf/factures/?payment=#{entry.number}"
                    linkTranslationKey: "operations.edf_details"
                    linkPlainEnglish: "Go to EDF app"
                operation.setAppDetails appDetails, (err) =>
                    if err
                        @log.raw err
                    else
                        @log.debug """
Url #{operation.appDetails} linked with operation:
#{operation.title} - #{operation.amount}
"""
                    callback()


# Procedure that link fetched bills to bank operation contained inside the
# Cozy.
module.exports = (options) ->

    (entries, next) ->
        log.info "link bank edf gogogo"
        linker = new BankOperationLinker options
        linker.link entries, next

