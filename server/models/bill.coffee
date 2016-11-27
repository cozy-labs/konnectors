cozydb = require 'cozydb'


module.exports = Bill = cozydb.getModel 'Bill',
    # Main type of the bill (check already used types in konnectors)
    type: String
    # Subtype of the bill (check already defined subtypes)
    subtype: String
    # Date of the billing
    date: Date
    # Third party from which the bill originates
    vendor: String
    # Bill amount
    amount: Number
    # VAT part on the bill
    vat: Number
    # Currency of the bill
    currency: String
    # TODO
    plan: String
    # Link to the bill document (not necessarily a PDF file)
    pdfurl: String
    # ID of the file content containing the bill, CouchDB metadata
    binaryId: String
    # ID of the file doctype containing the bill, CouchDB metadata
    fileId: String
    # TODO
    content: String
    # Whether this bill is a refund
    isRefund: Boolean
    # Date by which the bill should be paid
    duedate: Date
    # Date of the beginning of the billing period (if applicable)
    startdate: Date
    # Date of the end of the billing period (if applicable)
    finishdate: Date


Bill.all = (callback) ->
    Bill.request 'byDate', callback
