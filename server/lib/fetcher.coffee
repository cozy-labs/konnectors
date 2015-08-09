ware = require 'ware'


# Class to handle the layer of the fetching operation. Basically it runs a set
# of function and make sure they all share the same parameters.
#
# Example that runs to functions logIn and parsePage.
#
# fetcher.new()
#   .use(logIn)
#   .use(parsePage)
#   .args(requiredFields, {}, {})
#   .fetch (err, fields, entries) ->
#       log.info "Import finished"
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

