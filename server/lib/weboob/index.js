'use strict'

/**
 * A lib to communicate with a Weboob instance and build konnectors on top of weboob.
 */

// Local imports
import KonnectorConverter from './converters/Konnector'
import WeboobFetcher from './WeboobFetcher'

// Cache for weboob konnectors
var weboobKonnectors = null

/**
 * Build Konnectors objects for Weboob-backed modules
 *
 * @param   callback    optional callback receiving a list of BaseKonnector
 *                      objects
 */
const getWeboobKonnectors = function (callback) {
    let weboobFetcher = WeboobFetcher()

    const buildKonnectors = function (modules, callback) {
        let builtKonnectors = []

        Object.keys(modules).forEach(weboobType => {
            builtKonnectors = KonnectorConverter[weboobType](modules[weboobType]).parsedData
        })

        if (callback) {
            return callback(builtKonnectors)
        }
    }
    if (weboobKonnectors) {
        return callback(weboobKonnectors)
    } else {
        return weboobFetcher.connect(() =>
            weboobFetcher.list(data =>
                buildKonnectors(data, data => {
                    weboobKonnectors = data  // Store konnectors in cache
                    weboobFetcher.exit(() => callback(data))
                })
            )
        )
    }
}

export default {
    getWeboobKonnectors
}
