Konnector = require '../models/konnector'

module.exports =


    # Get konnector data (module parameters and user parameters)
    # Handle encrypted fields.
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


    # Returns konnector data (module parameters and user parameters)
    # Handle encrypted fields.
    show: (req, res, next) ->
        res.send req.konnector


    # Start import for a given konnector. Change state of the konnector during
    # import (set importing to true until the import finished).
    # If a date is given, it adds a new poller or reset the existing one if
    # it exists.
    # No import is started when the konnector is already in the is importing
    # state.
    import: (req, res, next) ->

        # Don't run a new import if an import is already running.
        if req.konnector.isImporting
            res.send 400, message: 'konnector is importing'
        else

            # Extract date information.
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

