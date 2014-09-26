async = require 'async'
log = require('printit')
       prefix: null
       date: true

Konnector = require '../models/konnector'

module.exports = (callback) ->
        Konnector.all (err, konnectors) ->

           log.info 'Looking for entries to patch...'
           async.eachSeries konnectors, (konnector, callback) ->
                # Check for presence of the field password in fieldValues
                if konnector.fieldValues?.password

                        # if password is empty
                        if konnector.password is ""

                                log.info "#{konnector.slug} | patching password..."
                                newPassword = konnector.fieldValues.password
                                # Emptying the old password field
                                konnector.fieldValues.password = null

                                data =
                                        fieldValues: konnector.fieldValues
                                        password: newPassword
                                        isImporting: false

                                # updating fieldValues.password and password in database
                                konnector.updateAttributes data, (err) ->
                                        if err
                                                log.info "#{konnector.slug} | #{err}"
                                        else
                                                log.info "#{konnector.slug} | patching succeeded"

                callback()
