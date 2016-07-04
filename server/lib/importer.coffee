async = require 'async'
handleNotification = require './notification_handler'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'
localization = require './localization_manager'



# Runs import operation for a given konnector. Once done, it propagates a
# notification if needed.
#
# It changes the isImporting status of the konnector. It is set to false before
# and after the import. It is set to true during the import.
# It saves the import date by changing the last import field.
module.exports = (konnector, callback) ->

    # check if the konnector is created and if its not already importing
    if konnector.accounts?.length > 0 and konnector.isImporting is false
        log.info "Run import for #{konnector.slug}."
        model = require "../konnectors/#{konnector.slug}"

        konnector.import (err, notifContents) ->

            # Change notification to an error message if an error occured.
            if err? and
            ((typeof(err) is 'object' and Object.keys(err).length > 0) or
            typeof(err) is String)
                log.error err
                localizationKey = 'notification import error'
                notifContents = [
                    localization.t localizationKey
                    name: model.name
                ]

            # Send the notifications.
            handleNotification konnector, notifContents

            # Update the lastAutoImport with the current date.
            data = lastAutoImport: new Date()
            konnector.updateAttributes data, (err) ->
                log.error err if err?
                callback?()

    else
        log.info "Connector #{konnector.slug} is already importing."
        callback?()

