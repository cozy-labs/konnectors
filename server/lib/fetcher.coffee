ware = require 'ware'


class Fetcher

    constructor: ->
        @ware = ware()

    args: ->
        @args = arguments
        @

    use: (operation) ->
        @ware.use operation
        @

    fetch: (callback) ->
        args = [].slice.call @args
        args.push(callback)

        @ware.run.apply @ware, args


module.exports =
    new: -> new Fetcher

