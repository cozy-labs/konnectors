async = require 'async'
log = require('printit')
       prefix: null
       date: true

Konnector = require '../models/konnector'
konnectorModules = require '../lib/konnector_hash'

module.exports = (callback) ->
        Konnector.all (err, konnectors) ->

           log.info 'Looking for entries to patch...'
           for konnector in konnectors
                # Check for presence of the field password in fieldValues
                if konnector.fieldValues and konnector.fieldValues.password

                        # if fieldValues.password is not empty and password is empty
                        if konnector.password is ""

                                log.info "#{konnector.slug} | patching password..."
                                newpassword = konnector.fieldValues.password
                                # Emptying the old password field
                                konnector.fieldValues.password = ""

                                data =
                                        fieldValues: konnector.fieldValues
                                        password: newpassword
                                        isImporting: false

                                # updating fieldValues.password and password in database
                                konnector.updateAttributes data
                                log.info "#{konnector.slug} | patching succeed"
