path = require 'path'
moment = require 'moment'
cozydb = require 'cozydb'
program = require 'commander'

Table = require 'cli-table'
log = require('printit')
    prefix: 'Konnector dev tool'


program
    .version('1.0.0')
    .usage('[options] <model>')
    .option('-d, --delete', 'Delete documents for given model.')
    .option('-c, --columns <columns>', 'Set column names for data table.')
    .option('-w, --widths <widths>', 'Set widths for data table columns.')
    .parse(process.argv)


unless program.args[0]?
    program.outputHelp()
    process.exit 1
else
    model = program.args[0]
    try
        Model = require path.join __dirname, "../server/models/#{model}"
    catch
        log.error "Cannot find given model."
        process.exit 1


if program.delete
    Model.requestDestroy 'byDate', (err) ->
        log.info 'All models were destroyed.'

else
    head = ['date', 'vendor']
    cols = []

    if program.columns?
        cols = program.columns.toString().split ','
        head = cols

    if program.widths?
        widths = program.widths.toString().split ','
        widths = widths.map (width) ->
            parseInt width
        colWidths = widths
    else
        colWidths = [13, 20]

    table = new Table
        head: head
        colWidths: colWidths

    Model.all (err, models) ->
        for model in models
            if cols.length is 0
                row = [
                    moment(model.date).format('YYYY-MM-DD')
                    model.vendor or ''
                ]
            else
                row = []
            values = cols.map (col) ->
                return model[col] or ''

            row = row.concat values
            table.push row

        console.log table.toString()
        console.log "#{models.length} rows"

