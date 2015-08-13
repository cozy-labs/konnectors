cozydb = require 'cozydb'


module.exports = Bill = cozydb.getModel 'Bill',
    type: type: String, default: 'hosting'
    date: Date
    vendor: type: String
    amount: Number
    plan: String
    pdfurl: String
    binaryId: String
    fileId: String


Bill.all = (callback) ->
    Bill.request 'byDate', callback

