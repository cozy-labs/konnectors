Konnector = require '../models/konnector'

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


    show: (req, res, next) ->
        res.send req.konnector


    import: (req, res, next) ->
        # don't save during import
        if req.konnector.isImporting
            res.send 400, message: 'konnector is importing'
        else

            # Delete unused variable
            if req.body.fieldValues.date?
                if req.body.fieldValues.date isnt ''
                    date = req.body.fieldValues.date
                delete req.body.fieldValues.date

            req.konnector.updateFieldValues req.body, (err) ->
                if err?
                    next err
                else
                    res.send 200
                    poller = require "../lib/konnector_poller"
                    poller.handleTimeout date, req.konnector
                    # Don't import data if a start date is defined
                    unless date?
                        req.konnector.import (err) ->
                            console.log err if err?

