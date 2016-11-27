'use strict'

/**
 * A lib to communicate with a Weboob instance and build konnectors on top of weboob.
 */

// Local imports
import KonnectorConverter from './converters/Konnector'
import WeboobFetcher from './WeboobFetcher'

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
    return weboobFetcher.connect(() =>
        weboobFetcher.list(data =>
            buildKonnectors(data, data =>
                weboobFetcher.exit(() => callback(data))
            )
        )
    )
}

export default {
    getWeboobKonnectors
}
