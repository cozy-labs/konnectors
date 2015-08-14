minimist = require 'minimist'
Konnector = require '../server/models/konnector'

log = require('printit')
    prefix: 'Konnector dev tool'

argv = minimist process.argv.slice(2)
konnectorName =  argv._[0]

konnectorHash = {}


log.info "Looking for konnector #{konnectorName}"
Konnector.all (err, konnectors) ->
    for konnector in konnectors
        konnectorHash[konnector.slug] = konnector

    konnector = konnectorHash[konnectorName]

    if not konnector?
        log.error "Konnector not found."
    else
        log.info "Import starting..."
        konnector.import ->
            log.info "Import is finished."

