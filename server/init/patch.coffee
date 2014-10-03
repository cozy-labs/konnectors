async = require 'async'
log = require('printit')
       prefix: null
       date: true

Konnector = require '../models/konnector'


module.exports = (callback) ->
        Konnector.all (err, konnectors) ->

           log.info 'Looking for entries to patch...'
           async.eachSeries konnectors, (konnector, callback) ->
                if konnector.password is ""
                        log.info "password of #{konnector.slug} is empty"
                        model = require "../konnectors/#{konnector.slug}"
                        newPassword = {}

                        for field, val of model.fields

                                # if the field type is a password
                                if val is "password"
                                        newPassword[field] = konnector.fieldValues[field]
                                        # Emptying the old password field
                                        konnector.fieldValues[field] = null
                        # If newPassword has been filled
                        log.info newPassword
                        if Object.keys(newPassword).length isnt 0
                                log.info "#{konnector.slug} | patching password..."

                                data =
                                        fieldValues: konnector.fieldValues
                                        password: JSON.stringify newPassword
                                        isImporting: false

                                # updating fieldValues and password in database
                                konnector.updateAttributes data, (err) ->
                                        if err
                                                log.info "#{konnector.slug} | #{err}"
                                        else
                                                log.info "#{konnector.slug} | patching succeeded"

                callback()
