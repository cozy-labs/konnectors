Konnector = require '../models/konnector'

module.exports =


    getKonnector: (req, res, next) ->
        Konnector.find req.params.konnectorId, (err, konnector) ->
            if err
                next err
            else if not konnector?
                res.send 404
            else
                req.konnector = konnector
                next()


    all: (req, res, next) ->
        Konnector.all (err, konnectors) ->
            if err
                next err
            else
                res.send konnectors


    import: (req, res, next) ->
        data =
            fieldValues: req.body.fieldValues
            isImporting: true

        req.konnector.updateAttributes data, (err) ->
            if err
                next err
            else
                slug = req.konnector.slug
                konnectorModule = require "../konnectors/#{slug}"
                konnectorModule.fetch fieldValues, (err) ->
                    if err
                        next err
                    else
                        data = isImporting: false
                        req.konnector.updateAttributes data, (err) ->
                            if err
                                next err
                            else
                                res.send success: true, 200
