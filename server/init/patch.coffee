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

            fieldValues = konnector.fieldValues
            konnector.password = "{}" if not konnector.password? or konnector.password.length is 0
            parsedPasswords = JSON.parse konnector.password

            # if fieldValues exists and if the number of passwords are not matching the number of declared passwords
            if fieldValues? and unEncryptedFields.length isnt Object.keys(parsedPasswords).length

                log.info "password of #{konnector.slug} is empty or not complete"

                konnector.removeEncryptedFields model.fields

                log.info "#{konnector.slug} | patching password..."

                # updating fieldValues and password in database
                konnector.save (err) ->
                    if err
                        log.info "#{konnector.slug} | #{err}"
                    else
                        log.info "#{konnector.slug} | patching succeeded"

                callback()

            else callback()

    , done
