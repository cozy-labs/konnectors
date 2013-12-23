Konnector = require '../models/konnector'

module.exports =
    all: (req, res, next) ->
        Konnector.all (err, konnectors) ->
            if err
                next err
            else
                res.send konnectors

    import: (req, res, next) ->
