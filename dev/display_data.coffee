minimist = require 'minimist'
moment = require 'moment'
Table = require 'cli-table'

table = new Table
    head: ['date', 'amount', 'type', 'vendor']
    colWidths: [13, 6, 20, 20]

log = require('printit')
    suffix: 'Konnector dev tool'

argv = minimist process.argv.slice(2)

model =  argv._[0]


try
    Model = require "../server/models/#{model}"
catch
    log.error "Cannot find given model"
    process.exit 1


Model.all (err, models) ->
    for model in models
        table.push [
            moment(model.date).format('YYYY-MM-DD')
            model.amount or ''
            model.type or ''
            model.vendor or ''
        ]

    console.log table.toString()
    console.log "#{models.length} rows"
