americano = require 'americano'
printit = require 'printit'
initKonnectors = require './server/init/konnectors'

log = printit
    prefix: null
    date: true

port = process.env.PORT || 9358
americano.start {name: 'template', port: port}, ->

    initKonnectors (err) ->
        if err
            log.error "An error occured."
            log.error "Konnectors were not properly initialized."
        else
            log.info "all konnectors are created."
