ware = require 'ware'

class Fetcher

    constructor: ->
        @ware = ware()

    use: (operation) ->
        @ware.use operation
        @

    fetch: ->
        @ware.run.apply @ware, arguments

module.exports =
    new: -> new Fetcher
