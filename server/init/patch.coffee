async = require 'async'
log = require('printit')
       prefix: null
       date: true

Konnector = require '../models/konnector'


module.exports = (done) ->
        Konnector.all (err, konnectors) ->

           log.info 'Looking for entries to patch...'
           async.eachSeries konnectors, (konnector, callback) ->
                model = require "../konnectors/#{konnector.slug}"
                unEncryptedFields = []
                for name, type of model.fields
                        if type is 'password'
                                unEncryptedFields.push name
                # We only patch if there is still encrypted fields in fieldValues
                fieldValues = konnector.fieldValues
                if fieldValues? and unEncryptedFields.length < Object.keys(fieldValues).length
                        log.info "password of #{konnector.slug} is empty"

                        newPassword = {}

                        konnector.removeEncryptedFields model.fields
                        # If newPassword has been filled
                        newPassword = JSON.parse konnector.password
                        if Object.keys(newPassword).length > 0
                                log.info "#{konnector.slug} | patching password..."

                                # updating fieldValues and password in database
                                konnector.save (err) ->
                                        if err
                                                log.info "#{konnector.slug} | #{err}"
                                        else
                                                log.info "#{konnector.slug} | patching succeeded"
                                        callback()
                        else callback()
                else callback()

        , done
