program = require 'commander'
Konnector = require '../server/models/konnector'
log = require('printit')
    prefix: 'Konnector dev tools'


program
    .version('1.0.0')
    .usage('')
    .option('-s, --show [konnector]', 'Show all connectors data')
    .option('-f, --fields <fieldValues>', 'Change value fields')
    .option('-k, --konnector <konnector>', 'Change value fields')
    .parse(process.argv)


displayKonnector = (konnector) ->
    data =
        slug: konnector.slug
        fieldValues: konnector.fieldValues
        fields: konnector.fields
        lastSuccess: konnector.lastSuccess
        lastImport: konnector.lastImport
        isImporting: konnector.isImporting
        importInterval: konnector.importInterval
        importErrorMessage: konnector.importErrorMessage

    log.lineBreak()
    for key, value of data
        if key is 'fieldValues'
            console.log "fieldValues:"
            for fieldKey, fieldValue of value
                console.log "    #{fieldKey}: #{fieldValue}"
        else
            console.log "#{key}: #{value}"
    log.lineBreak()


if program.show
    Konnector.all (err, konnectors) ->
        if typeof(program.show) is 'boolean'
            for konnector in konnectors
                displayKonnector konnector
        else
            for konnector in konnectors when konnector.slug is program.show
                displayKonnector konnector

else if program.fields

            for konnector in konnectors when konnector.slug is program.show
                displayKonnector konnector
    fieldValues = {}
    for field in fields.split(',')

else
    program.outputHelp()

