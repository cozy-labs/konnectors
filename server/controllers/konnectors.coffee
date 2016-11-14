path = require 'path'
Konnector = require '../models/konnector'
konnectorHash = require '../lib/konnector_hash'
handleNotification = require '../lib/notification_handler'

log = require('printit')
    prefix: 'konnector controller'


module.exports =

    # Get konnector data (module parameters and user parameters)
    # Handle encrypted fields.
    getKonnector: (req, res, next) ->
        Konnector.find req.params.konnectorId, (err, konnector) ->
            if err
                next err
            else if not konnector?
                res.sendStatus 404
            else
                if konnector.shallRaiseEncryptedFieldsError()
                    konnector.importErrorMessage = 'encrypted fields'
                else
                    konnector.injectEncryptedFields()

                # Add customView field
                konnectorModule = require(
                    path.join(
                        '..',
                        'konnectors',
                        konnector.slug
                    )
                )
                if konnectorModule.default?
                    konnectorModule = konnectorModule.default

                if konnectorModule.customView?
                    konnector.customView = konnectorModule.customView

                if konnectorModule.connectUrl?
                    konnector.connectUrl = konnectorModule.connectUrl

                req.konnector = konnector
                next()


    # Returns konnector data (module parameters and user parameters)
    # Handle encrypted fields.
    show: (req, res, next) ->
        res.send req.konnector


    # Reset konnector fields.
    remove: (req, res, next) ->

        data =
            lastAutoImport: null
            importErrorMessage: null
            accounts: []
            password: '{}'

        req.konnector.updateAttributes data, (err, konnector) ->
            return next err if err

            res.status(204).send konnector


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
            if req.body.date?
                if req.body.date isnt ''
                    date = req.body.date
                delete req.body.date

            req.konnector.updateFieldValues req.body, (err) ->
                if err?
                    next err
                else
                    poller = require "../lib/poller"
                    poller.add date, req.konnector

                    # Don't import data if a start date is defined
                    unless date?
                        req.konnector.import (err, notifContent) ->
                            if err?
                                log.error err
                            else
                                handleNotification req.konnector, notifContent
                    res.status(200).send success: true

    redirect: (req, res, next) ->
        try
            accounts = req.konnector.accounts or []
            account = accounts[req.params.accountId] or {}
            for k, v of req.query
                account[k] = v

            accounts[req.params.accountId] = account
        catch e then return next e

        req.konnector.updateFieldValues { accounts: accounts }, (err) ->
            return next err if err

            res.redirect '/#konnector/' + req.konnector.slug
