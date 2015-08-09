async = require 'async'
NotificationHelper = require 'cozy-notifications-helper'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'
localization = require './localization_manager'
notification = new NotificationHelper 'konnectors'


# Runs import operation for a given konnector. Once done, it propagates a
# notification if needed.
#
# It changes the isImporting status of the konnector. It is set to false before
# and after the import. It is set to true during the import.
# It saves the import date by changing the last import field.
module.exports = (konnector) ->

    # check if the konnector is created and if its not already importing
    if konnector.fieldValues? and konnector.isImporting is false
        log.debug "Importing #{konnector.slug}"
        model = require "../konnectors/#{konnector.slug}"

        konnector.import (err, notifContent) ->
            if err?
                log.error err
                localizationKey = 'notification import error'
                notifContent = localization.t localizationKey, name: model.name

            notificationSlug = konnector.slug

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

            # Update the lastAutoImport with the current date
            data = lastAutoImport: new Date()
            konnector.updateAttributes data, (err) ->
                log.error err if err?

    else
        log.debug "Connector #{konnector.slug} already importing"

