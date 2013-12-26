Konnector = require '../models/konnector'

module.exports =
    all: (req, res, next) ->
        Konnector.all (err, konnectors) ->
            if err
                next err
            else
                res.send konnectors

    getKonnector: (req, res, next) ->
        Konnector.find req.params.konnectorId, (err, konnector) ->
            if err
                next err
            else if not konnector?
                res.send 404
            else
                req.konnector = konnector
                next()

    import: (req, res, next) ->
        fields = req.body.fields
        req.konnector.updateAttributes fields: fields, (err) ->
            if err
                next err
            else
                name = req.konnector.name
                konnectorModule = require "../konnectors/#{name}"
                konnectorModule.fetch fields, (err) ->
                    if err
                        next err
                    else
                        res.send success: true, 200
