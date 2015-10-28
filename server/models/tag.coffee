cozydb = require 'cozydb'
log = require('printit')
    prefix: 'tag:model'

module.exports = class Tag extends cozydb.CozyModel
    @schema:
        name: type: String
        color: type: String

Tag.all = (callback) ->
    Tag.request 'byName', callback

Tag.byName = (name, callback) ->
    Tag.request 'byName', key: name, callback

Tag.getOrCreate = (data, callback) ->
    # Name is a primary key.
    Tag.byName data.name, (err, tags)->
        if err
            log.error err
            Tag.create data, callback

        else if tags.length is 0
            Tag.create data, callback

        else # Tag already exists.
            callback null, tags[0]
