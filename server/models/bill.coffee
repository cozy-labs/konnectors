cozydb = require 'cozydb'

module.exports = Bill = cozydb.getModel 'Bill',
    type: type: String, default: 'hosting'
    date: Date
    vendor: type: String, default: 'Digital Ocean'
    amount: Number
    plan: String
    fileId: String


Bill.all = (callback) ->
    Bill.request 'byDate', callback

