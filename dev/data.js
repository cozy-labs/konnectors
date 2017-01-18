import Table from 'cli-table'
import fs from 'fs'
import moment from 'moment'
import path from 'path'

let baseBuildPath = path.join(
    path.dirname(fs.realpathSync(__filename)),
    '../build/'
)

let getModel = function (modelName, log) {
  try {
    let Model = require(
            path.join(
                baseBuildPath,
                '/server/models/',
                modelName
            )
        )
    return Model
  } catch (error) {
    log.error('Cannot find given model.')
    return process.exit(1)
  }
}

export default {

    // Delete all instance of given model in database.
    // It allows to clean the database after one or several imports. It makes
    // things clearer for debugging.
  delete (modelName, callback, log) {
    let Model = getModel(modelName, log)
    return Model.requestDestroy('byDate', function (err) {
      if (err) {
        return Model.requestDestroy('all', function (err) {
          if (err) { log.error.err }
          return callback(err)
        })
      } else {
        return callback()
      }
    })
  },

    // Display in a table all instances of a given listed in database.
    // It allow to select which fields should be displayed and set the width
    // of columns via `columns` and `width` fields.
    // It's useful to see what was imported in the database after an import.
  show (opts, callback, log) {
    let {modelName, columns, widths} = opts
    let Model = getModel(modelName, log)
    let head = ['date', 'vendor']
    let cols = []

    if (columns) {
      cols = columns.toString().split(',')
      head = cols
    }

    if (widths) {
      widths = widths.toString().split(',')
      widths = widths.map(width => parseInt(width))
      var colWidths = widths
    } else {
      colWidths = [13, 20]
    }

    let table = new Table({
      head,
      colWidths
    })

    return Model.all(function (err, models) {
      if (err) {
        log.error(err)
      }

      models.sort(function (a, b) {
        if (a.slug != null) {
          return a.slug.localeCompare(b.slug)
        } else if (a.date != null) {
          return a.date > b.date
        } else {
          return a.id > b.id
        }
      })

      for (let model of models) {
        if (cols.length === 0) {
          var row = [
            moment(model.date).format('YYYY-MM-DD'),
            model.vendor || ''
          ]
        } else {
          row = []
        }
        let values = cols.map(col => model[col] || '')

        row = row.concat(values)
        table.push(row)
      }

      console.log(table.toString())
      console.log(`${models.length} rows`)
      return callback()
    })
  }
}
