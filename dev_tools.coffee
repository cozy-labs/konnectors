program = require 'commander'
data = require './dev/data'
connector = require './dev/connector'
log = require('printit')
    prefix: 'Konnector dev tool'


program
    .usage('[options]')
    .option('-a, --status [connector]', 'Show given connector data')
    .option('-i, --import <connector>', 'Run import for given konnector.')
    .option('-k, --change <connector>',
            'Change field values for given konnector.')
    .option('-f, --fields <fieldValues>', 'New value to set as fields.')
    .option('-n, --init', 'Init connectors metadata.')
    .option('-s, --show <docType>', 'Show documents for given model.')
    .option('-d, --delete <docType>', 'Delete documents for given model.')
    .option('-c, --columns <columns>', 'Set column names for data table.')
    .option('-w, --widths <widths>', 'Set widths for data table columns.')
    .parse(process.argv)


if program.status
    konnectorName = program.status

    if typeof(konnectorName) is 'boolean'
        connector.display null, ->
    else
        connector.display konnectorName, ->


else if program.change

    if program.fields
        konnectorName = program.change
        fields = program.fields.split(',')
        log.info "Changing fields for #{konnectorName} with #{fields}."
        connector.change konnectorName, fields, (err) ->
            if err
                log.error "Failed to change fields."
                log.error err
            else
                log.info """
Fields were successfully changed for #{konnectorName}
Note: only fields described in the connector file are stored.
"""

    else
        log.error "Field values are required (see --fields option)."


else if program.import
    konnectorName = program.import
    log.info "Running import for #{konnectorName}..."

    connector.run konnectorName, (err) ->
        if err
            log.error "An error occured while trying to run the import."
            log.error err.message
        else
            log.info "Import is finished."


else if program.init

    log.info 'Start initializing connectors...'
    connector.init ->
        log.info 'Init done.'


else if program.show or program.delete

    if program.delete
        modelName = program.delete
        data.delete modelName, (err) ->
            if err
                log.info 'Destroying models failed.'
            else
                log.info 'All models were destroyed.'

    else if program.show
        modelName = program.show
        opts =
            modelName: modelName,
            columns: program.columns,
            widths: program.widths
        data.show opts, ->
            log.lineBreak()


else
    program.outputHelp()
    process.exit 0

