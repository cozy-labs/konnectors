cozydb = require 'cozydb'


module.exports = Commit = cozydb.getModel 'Commit',
    date: Date
    sha: String
    parent: String
    tree: String
    url: String
    author: String
    email: String
    message: String
    additions: Number
    deletions: Number
    files: Object
    vendor: {type: String, default: 'Github'}


Commit.all = (params, callback) ->
    Commit.request 'byDate', params, callback

