async = require 'async'
log = require('printit')
    prefix: null
    date: true
Konnector = require '../models/konnector'
notificationHelper = require('cozy-notifications-helper')
notification = new notificationHelper()

module.exports = (konnector) ->
    # check if the konnector is created and if its not already importing
    if konnector.fieldValues? and konnector.isImporting is false
        log.debug "Importing #{konnector.slug}"
        model = require "../konnectors/#{konnector.slug}"
        konnector.import konnector, model.fields, (err) ->
            if err
                log.error err
                notification.createTemporary
                    text: "#{konnector.slug}: Import error"
                    resource:
                        app: 'konnectors'
                        url: '/'
            else
                notification.createTemporary
                    text: "#{konnector.slug}: Import success"
                    resource:
                        app: 'konnectors'
                        url: '/'

    else
        log.debug "Connector #{konnector.slug} already importing"

    # Update the lastAutoImport with the current date
    data =
        lastAutoImport: new Date()
    konnector.updateAttributes data, (err) ->
        if err
            log.error err
