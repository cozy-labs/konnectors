Konnector = require '../models/konnector'
localization = require '../lib/localization_manager'
NotificationHelper = require 'cozy-notifications-helper'
notification = new NotificationHelper 'konnectors'
konnectorHash = require '../lib/konnector_hash'

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


    # Reset konnector fields.
    remove: (req, res, next) ->

        data =
            lastAutoImport: null
            fieldValues: {}
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
            if req.body.fieldValues.date?
                if req.body.fieldValues.date isnt ''
                    date = req.body.fieldValues.date
                delete req.body.fieldValues.date

            req.konnector.updateFieldValues req.body, (err) ->
                if err?
                    next err
                else
                    res.send 200
                    poller = require "../lib/poller"
                    poller.add date, req.konnector

                    # Don't import data if a start date is defined
                    unless date?
                        req.konnector.import (err, notifContent) ->
                            if err?
                                log.error err
                            else
                                handleNotification req.konnector, notifContent



# Create a notification telling how many data were imported.
handleNotification = (konnector, notifContent) ->
    notificationSlug = konnector.slug
    model = konnectorHash[konnector.slug]

    if notifContent?
        prefix = localization.t 'notification prefix', name: model.name
        notification.createOrUpdatePersistent notificationSlug,
            app: 'konnectors'
            text: "#{prefix} #{notifContent}"
            resource:
                app: 'konnectors'
                url: "konnector/#{konnector.slug}"
        , (err) ->
            log.error err if err?

    else
        # If there was an error before, but that last import was
        # successful AND didn't not return a notification content, the
        # error notification is simply removed.
        notification.destroy notificationSlug, (err) ->
            log.error err if err?

