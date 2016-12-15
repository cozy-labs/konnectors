cozydb = require 'cozydb'


module.exports = EDFBill = cozydb.getModel 'Bill',
    type: String
    subtype: String
    date: Date
    vendor: String
    amount: Number
    plan: String
    pdfurl: String
    binaryId: String
    fileId: String
    content: String
    isRefund: Boolean
    clientId: String # Client number in vendor CRM
    number: String # Bill Id, in vendor CRM
    docTypeVersion: String # Document traceability : appName_Konnector-version



EDFBill.all = (callback) ->
    EDFBill.request 'byDate', callback
