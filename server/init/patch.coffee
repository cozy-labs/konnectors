async = require 'async'
log = require('printit')
    prefix: null
    date: true

Konnector = require '../models/konnector'

module.exports = (done) ->
    Konnector.all (err, konnectors) ->

        console.log 'here'
        # For some reason, async.eachSeries doesn't call its callback if
        # the array is empty so we do it manually
        return done() if konnectors.length is 0

        log.info 'Looking for entries to patch...'
        async.eachSeries konnectors, (konnector, callback) ->

            model = require "../konnectors/#{konnector.slug}"

            # Store every field of password type
            unEncryptedFields = []
            for name, type of model.fields
                if type is 'password'
                    unEncryptedFields.push name

            fieldValues = konnector.fieldValues
            if not konnector.password? or konnector.password.length is 0
                konnector.password = "{}"
            parsedPasswords = JSON.parse konnector.password

            # if fieldValues exists and if the number of passwords are not
            # matching the number of declared passwords
            if fieldValues? and unEncryptedFields.length isnt \
            Object.keys(parsedPasswords).length

                # If fieldValues and model contain the same number of fields
                # This prevents from patching when some fields are absent
                if Object.keys(model.fields).length is \
                Object.keys(fieldValues).length
                    log.info "password of #{konnector.slug} not complete"

                    konnector.removeEncryptedFields model.fields

                    log.info "#{konnector.slug} | patching password..."

                    # updating fieldValues and password in database
                    konnector.save (err) ->
                        if err
                            log.info "#{konnector.slug} | #{err}"
                        else
                            log.info "#{konnector.slug} | patching succeeded"

                        callback()
                else
                    log.debug "Missing fields in #{konnector.slug}"
                    callback()

            else callback()

        , (err) ->
            done()
