path = require 'path'
program = require 'commander'
Konnector = require path.join  __dirname, '../server/models/konnector'

log = require('printit')
    prefix: 'Konnector dev tool'


program
    .version('1.0.0')
    .usage('<konnector>')
    .parse(process.argv)



unless program.args[0]?
    program.outputHelp()
    process.exit 1
else
    konnectorName = program.args[0]


log.info "Looking for konnector #{konnectorName}"
Konnector.all (err, konnectors) ->
    konnectorHash = {}
    for konnector in konnectors
        konnectorHash[konnector.slug] = konnector

    konnector = konnectorHash[konnectorName]

    if not konnector?
        log.error "Konnector not found."
    else
        log.info "Import starting..."
        konnector.fieldValues ?= {}
        konnector.import ->
            log.info "Import is finished."

