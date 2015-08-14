minimist = require 'minimist'
moment = require 'moment'
Table = require 'cli-table'
log = require('printit')
    prefix: 'Konnector dev tool'

argv = minimist process.argv.slice(2)
model =  argv._[0]


try
    Model = require "../server/models/#{model}"
catch
    log.error "Cannot find given model"
    process.exit 1


if argv.delete
    Model.requestDestroy 'byDate', (err) ->
        log.info 'All models were destroyed.'

else
    head = ['date', 'vendor']

    cols = []
    if argv.columns?
        cols = argv.columns.toString().split ','
        head = head.concat cols

    if argv.widths?
        widths = argv.widths.toString().split ','
        widths = widths.map (width) ->
            parseInt width
        colWidths = [13, 20].concat widths
    else
        colWidths = [13, 20]

    table = new Table
        head: head
        colWidths: colWidths

    Model.all (err, models) ->
        for model in models
            row = [
                moment(model.date).format('YYYY-MM-DD')
                model.vendor or ''
            ]
            values = cols.map (col) ->
                return model[col] or ''

            row = row.concat values
            table.push row

        console.log table.toString()
        console.log "#{models.length} rows"

