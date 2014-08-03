Konnector = require '../models/konnector'
konnectorHash = require '../lib/konnector_hash'



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
                for konnector in konnectors
                    # here add missing fields
                    konnectorData = konnectorHash[konnector.slug]
                    for key of konnectorData
                        konnector[key] = konnectorData[key]

                    modelNames = []
                    for key, value of konnector.models
                        name = value.toString()
                        name = name.substring '[Model '.length
                        name = name.substring 0, (name.length - 1)
                        modelNames.push name
                    konnector.modelNames = modelNames

                konnectors.sort (konnectorA, konnectorB) ->
                    konnectorA.name.localeCompare konnectorB.name

                res.send konnectors


    show: (req, res, next) ->
        res.send req.konnector


    import: (req, res, next) ->
        if req.konnector.isImporting
            setTimeout =>
                data =
                    isImporting: false
                    lastImport: new Date()
                req.konnector.updateAttributes data, (err) ->
            , 6
            res.send error: true, msg: 'konnector is already importing', 400
        else
            req.konnector.import req.body.fieldValues, (err) ->
                if err
                    next err
                else
                    res.send success: true, 200
