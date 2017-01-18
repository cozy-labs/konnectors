import cozydb from 'cozydb'
import fs from 'fs'
import path from 'path'

let baseBuildPath = path.join(
    path.dirname(fs.realpathSync(__filename)),
    '../build/'
)

// Display most important fields of a konnector. It hides the password
// in case some are stored in the field values of the connector.
let displayKonnector = function (konnector, log) {
  konnector.removeEncryptedFields()
    // The fields are in the konnector file
  let konnectorConfig = {}
  try {
    konnectorConfig = require(
            path.join(
                baseBuildPath,
                '/server/konnectors/',
                konnector.slug
            )
        )
    if (konnectorConfig.default !== undefined) {
      konnectorConfig = konnectorConfig.default
    }
  } catch (error) {
    log.error(`Konnector file name and konnector slug do not match.\
                    Slug is: ${konnector.slug}`
        )
  }
  log.raw({
    slug: konnector.slug,
    accounts: konnector.accounts,
    fields: konnectorConfig.fields,
    lastSuccess: konnector.lastSuccess,
    lastImport: konnector.lastImport,
    isImporting: konnector.isImporting,
    importInterval: konnector.importInterval,
    importErrorMessage: konnector.importErrorMessage
  })
  return log.lineBreak()
}

export default {
    // Run an import to avoid running the full web app.
  run (konnectorName, callback, log) {
    let Konnector = require(
            path.join(
                baseBuildPath,
                '/server/models/konnector'
            )
        )
    let konnectorConfig = require(
            path.join(
                baseBuildPath,
                '/server/konnectors/',
                konnectorName
            )
        )
    if (konnectorConfig.default !== undefined) {
      konnectorConfig = konnectorConfig.default
    }
    return Konnector.get(konnectorName, function (err, konnector) {
      if (err) { return callback(err) }
      konnector.appendConfigData(konnectorConfig)

      if (konnector == null) {
        return callback(new Error('Konnector not found.'))
      } else {
        log.info('Import starting...')
        if (konnector.fieldValues == null) { konnector.fieldValues = {} }
        return konnector.import(function (err) {
          if (err) { log.error(err) }
          return callback()
        })
      }
    })
  },

    // Allow to change field values of connector. That way the import can be
    // runned without loading the full web app.
    // Expected format for fields is a mapping of fields names to values.
  change (konnectorName, fields, callback, log) {
    let account = {}
    for (var key in fields) {
      let value = fields[key]
      if (typeof value === 'object') {
        value = JSON.stringify(value)
      }
      account[key] = value
    }

    let Konnector = require(
            path.join(
                baseBuildPath,
                '/server/models/konnector'
            )
        )

    return Konnector.all(function (err, konnectors) {
      if (err) { return callback(err) }

      let konnector = konnectors.find(konnector => konnector.slug === konnectorName)

      if (konnector.accounts && konnector.accounts.length > 0) {
        var { accounts } = konnector
        for (key in account) {
          let fields = konnector.getFields()
          if (fields[key] === undefined) {
            return callback(new Error(
                            "Can't set fields which are not in the konnector fields list: " + key)
                        )
          }
          let value = account[key]
          accounts[0][key] = value
        }
      } else {
        accounts = [account]
      }

      if (konnector) {
        return konnector.updateAttributes({accounts}, callback)
      } else {
        return callback(new Error(
                    "Can't find given konnector (slug expected).")
                )
      }
    })
  },

    // Display konnector information stored in the database. It helps debugging
    // by ensuring that values are properly set.
  display (konnectorName, callback, log) {
    let Konnector = require(
            path.join(
                baseBuildPath,
                '/server/models/konnector'
            )
        )
    return Konnector.all(function (err, konnectors) {
      if (err) {
        log.error(err)
      }

      if (konnectorName) {
        var konnector = konnectors.find(konnector => konnector.slug === konnectorName)
        if (konnector) {
          displayKonnector(konnector, log)
        } else {
          log.error(`Can't find konnector ${konnectorName}.`)
        }
      } else {
        konnectors.sort(function (a, b) {
          if (a.slug != null) {
            return a.slug.localeCompare(b.slug)
          } else if (a.date != null) {
            return a.date > b.date
          } else {
            return a.id > b.id
          }
        })
        for (var k of konnectors) { displayKonnector(k, log) }
      }
      return callback()
    })
  },

    /**
     * Initialize connectors
     */
  init (callback, log) {
    let initKonnectors = require(
            path.join(
                baseBuildPath,
                '/server/init/konnectors'
            )
        )
    return cozydb.configure(
      {
        modelsPath: path.join(baseBuildPath, '/server/models')
      },
            null,
            () => initKonnectors(() => callback())
        )
  },

    /**
     * Deinitialize connectors
     */
  deinit (konnectorName, callback, log) {
    let Konnector = require(
            path.join(
                baseBuildPath,
                '/server/models/konnector'
            )
        )
    return Konnector.all(function (err, konnectors) {
      if (err) { return log.error(err) }

      if (konnectorName) {
        let konnector = konnectors.find(konnector => konnector.slug === konnectorName)
        return konnector.destroy(callback)
      } else {
        konnectors.map(konnector => konnector.destroy(callback))
      }
    })
  }
}
