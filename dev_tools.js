import program from 'commander'
import printit from 'printit'

import {connector, data} from './dev'

let log = printit({
  prefix: 'Konnector dev tool'
})

program
    .usage('[options]')
    .option('-a, --status [connector]', 'Show connectors data')
    .option('-i, --import <connector>', 'Run import for given konnector.')
    .option('-k, --change <connector>',
            'Change field values for given konnector.')
    .option('-f, --fields <fieldValues>', 'New value to set as fields.')
    .option('-n, --init', 'Init connectors metadata.')
    .option('-s, --show <docType>', 'Show documents for given model.')
    .option('-d, --delete <docType>', 'Delete documents for given model.')
    .option('-c, --columns <columns>', 'Set column names for data table.')
    .option('-w, --widths <widths>', 'Set widths for data table columns.')
    .option('-l, --list', 'List the slugs of all available konnectors')
    .option('-p, --purge [connector]', 'Purge connectors from database.')
    .parse(process.argv)

if (program.status) {
  let konnectorName = program.status

  if (typeof (konnectorName) === 'boolean') {
    connector.display(null, function () {}, log)
  } else {
    connector.display(konnectorName, function () {}, log)
  }
} else if (program.change) {
  if (program.fields) {
    var konnectorName = program.change
    let fields = JSON.parse(program.fields)
    log.info(`Changing fields for ${konnectorName} with ${program.fields}.`)
    connector.change(konnectorName, fields, function (err) {
      if (err) {
        log.error('Failed to change fields.')
        return log.error(err)
      } else {
        return log.info(`Fields were successfully changed for ${konnectorName}
Note: only fields described in the connector file are stored.`
                )
      }
    }, log)
  } else {
    log.error('Field values are required (see --fields option).')
  }
} else if (program.import) {
  konnectorName = program.import
  log.info(`Running import for ${konnectorName}...`)

  connector.run(konnectorName, function (err) {
    if (err) {
      log.error('An error occured while trying to run the import.')
      return log.error(err.message)
    } else {
      return log.info('Import is finished.')
    }
  }, log)
} else if (program.init) {
  log.info('Start initializing connectors...')
  connector.init(() => log.info('Init done.'), log)
} else if (program.purge) {
  let konnectorName = program.purge

  if (typeof (konnectorName) === 'boolean') {
    connector.deinit(null, () => log.info('Done deleting.'), log)
  } else {
    connector.deinit(konnectorName, () => log.info('Done deleting.'), log)
  }
} else if (program.show || program.delete) {
  if (program.delete) {
    var modelName = program.delete
    data.delete(modelName, function (err) {
      if (err) {
        return log.info('Destroying models failed.')
      } else {
        return log.info('All models were destroyed.')
      }
    }, log)
  } else if (program.show) {
    modelName = program.show
    var opts = {
      modelName,
      columns: program.columns,
      widths: program.widths
    }
    data.show(opts, () => log.lineBreak(), log)
  }
} else if (program.list) {
  opts = {
    modelName: 'konnector',
    columns: 'slug',
    widths: '20'
  }
  data.show(opts, () => log.lineBreak(), log)
} else {
  program.outputHelp()
  process.exit(0)
}
