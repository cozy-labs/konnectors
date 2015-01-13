async = require 'async'
notificationHelper = require 'cozy-notifications-helper'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'
localization = require './localization_manager'
notification = new notificationHelper()

module.exports = (konnector) ->
    # check if the konnector is created and if its not already importing
    if konnector.fieldValues? and konnector.isImporting is false
        log.debug "Importing #{konnector.slug}"
        model = require "../konnectors/#{konnector.slug}"
        konnector.import konnector, model.fields, (err) ->
            if err?
                log.error err
                localizationKey = 'notification import error'
            else
                localizationKey = 'notification import success'
            msg = localization.t localizationKey, name: model.name
            notification.createTemporary
                text: msg
                resource:
                    app: 'konnectors'
                    url: "konnector/#{konnector.slug}"

    else
        log.debug "Connector #{konnector.slug} already importing"

    # Update the lastAutoImport with the current date
    data = lastAutoImport: new Date()
    konnector.updateAttributes data, (err) ->
        if err
            log.error err
