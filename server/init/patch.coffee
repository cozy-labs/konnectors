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
                        log.info "password of #{konnector.slug}is empty"
                        model = require "../konnectors/#{konnector.slug}"
                        newPassword = "{"
                        count = false

                        for field, val of model.fields
                                log.info "#{field} : #{val}"

                                # if the field type is a password
                                if val is "password"
                                        if count then newPassword += ","
                                        count = true
                                        if konnector.fieldValues[field] is ""
                                                newPassword += "\"#{field}\":\"\""
                                        else
                                                newPassword += "\"#{field}\":\"#{konnector.fieldValues[field]}\""
                                                # Emptying the old password field
                                                konnector.fieldValues[field] = null
                        newPassword += "}"
                        # If newPassword has been filled
                        if newPassword != "{}"
                                log.info "value: #{newPassword}"
                                log.info "#{konnector.slug} | patching password..."

                                data =
                                        fieldValues: konnector.fieldValues
                                        password: newPassword
                                        isImporting: false

                                # updating fieldValues and password in database
                                konnector.updateAttributes data, (err) ->
                                        if err
                                                log.info "#{konnector.slug} | #{err}"
                                        else
                                                log.info "#{konnector.slug} | patching succeeded"

                callback()
