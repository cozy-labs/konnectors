path = require 'path'
moment = require 'moment'
cozydb = require 'cozydb'
Table = require 'cli-table'
log = require('printit')
    prefix: 'Konnector dev tool'



getModel = (modelName) ->
    try
        Model = require path.join __dirname, "../server/models/#{modelName}"
        return Model
    catch
        log.error "Cannot find given model."
        process.exit 1


module.exports =

    # Delete all instance of given model in database.
    # It allows to clean the database after one or several imports. It makes
    # things clearer for debugging.
    delete: (modelName, callback) ->
        Model = getModel modelName
        Model.requestDestroy 'byDate', (err) ->
            if err
                Model.requestDestroy 'all', (err) ->
                    log.error.err if err
                    callback err
            else
                callback()


    # Display in a table all instances of a given listed in database.
    # It allow to select which fields should be displayed and set the width
    # of columns via `columns` and `width` fields.
    # It's useful to see what was imported in the database after an import.
    show: (opts, callback) ->
        {modelName, columns, widths} = opts
        Model = getModel modelName
        head = ['date', 'vendor']
        cols = []

        if columns
            cols = columns.toString().split ','
            head = cols

        if widths
            widths = widths.toString().split ','
            widths = widths.map (width) ->
                parseInt width
            colWidths = widths
        else
            colWidths = [13, 20]

        table = new Table
            head: head
            colWidths: colWidths

        Model.all (err, models) ->
            models.sort (a, b) ->
                if a.slug?
                    a.slug.localeCompare b.slug
                else if a.date?
                    a.date > b.date
                else
                    a.id > b.id

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
            callback()

