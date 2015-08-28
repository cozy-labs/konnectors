async = require 'async'
Commit = require '../models/commit'
log = require('printit')
    prefix: 'konnectors'

count = 0

# This patch removes all duplicated commits. A commit is identified by its SHA.
module.exports = (callback) ->
    count = 0

    log.info 'looking for duplicated commits...'
    Commit.all (err, commits) ->
        duplicatesArray = buildDuplicatedArrays commits
        async.eachSeries duplicatesArray, (duplicates, next) ->
            log.info "ok"
            if duplicates.length in [0, 1]
                next()
            else
                deleteDuplicates duplicates, next
        , (err) ->
            log.info "deleted duplicated commits: #{count}"

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
        duplicate.destroy (err) ->
            if err then log.error err else count++
            next()
    , (err) ->
        callback()

