async = require 'async'
log = require('printit')
    prefix: null
    date: true
Konnector = require '../models/konnector'

module.exports = (konnector) ->

    if konnector.fieldValues? and konnector.isImporting is false
        log.debug "Importing #{konnector.slug}"
        model = require "../konnectors/#{konnector.slug}"
        konnector.import konnector, model.fields, (err) ->
            if err
                log.info err
    else
        log.debug "Connector #{konnector.slug} already importing"
