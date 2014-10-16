async = require 'async'
log = require('printit')
    prefix: null
    date: true
Konnector = require '../models/konnector'

module.exports = (done) ->
    log.info "fetching data ..."

    Konnector.all (err, konnectors) ->

        async.eachSeries konnectors, (konnector, callback) ->

            # if the konnector fields are not empty and its not already importing
            if konnector.fieldValues? and konnector.isImporting is false
                log.info "Processing #{konnector.slug}"

                model = require "../konnectors/#{konnector.slug}"
                konnector.import konnector.fieldValues, model.fields, (err) ->
                    if err
                        console.log err

                callback()
            # Empty konnectorr
            else
                callback()
    , done
