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
                konnector.injectEncryptedFields()
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
                    konnector.name.localeCompare konnectorB.name

                res.send konnectors


    show: (req, res, next) ->
        res.send req.konnector


    import: (req, res, next) ->
        # Handle timeouts
        poller = require "../lib/konnector_poller"
        poller.handleTimeout(req.body)
        # Delete unused variable
        if req.body.fieldValues.date?
            delete req.body.fieldValues.date
        if req.konnector.isImporting
            setTimeout =>
                data =
                    isImporting: false
                    lastImport: new Date()
                req.konnector.updateAttributes data, (err) ->
            , 6
            res.send error: true, msg: 'konnector is already importing', 400
        else
            fields = konnectorHash[req.konnector.slug].fields
            req.konnector.import req.body, fields, (err) ->
                if err
                    #console.log res
                    res.send err, 400
                else
                    res.send success: true, 200
