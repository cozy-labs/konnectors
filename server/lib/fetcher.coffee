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


    # Set arguments to give to all layers.
    args: ->
        @args = arguments
        @


    # Add a layer to use. A layer is a function to execute while fetching.
    use: (operation) ->
        @ware.use operation
        @


    # Run fetching by running layers one by one.
    fetch: (callback) ->
        args = [].slice.call @args
        args.push(callback)

        @ware.run.apply @ware, args


    # Return all set layers.
    getLayers: ->
        return @ware.fns


module.exports =
    new: -> new Fetcher

