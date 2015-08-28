async = require 'async'
Commit = require '../models/commit'


# This patch removes all duplicated commits. A commit is identified by its SHA.
module.exports = (callback) ->

    Commit.all (err, commits) ->
        duplicatesArray = buildDuplicatedArrays commits
        async.eachSeries duplicatesArray, (duplicates, next) ->
            if duplicates.length in [0, 1]
                next()
            else
                deleteDuplicates duplicates, next
        , (err) ->
            callback()


buildDuplicatedArrays = (commits) ->

    shaHash = {}
    for commit in commits
        shaHash[commit.sha] ?= []
        shaHash[commit.sha].push commit

    return Object.keys(shaHash).map (key) -> shaHash[key]


deleteDuplicates = (duplicates, callback) ->
    duplicates.pop()
    async.eachSeries duplicates, (duplicate, next) ->
        duplicate.destroy next
    , (err) ->
        callback()

