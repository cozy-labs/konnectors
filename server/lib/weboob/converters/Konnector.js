/**
 * Converters between exported data and Bill model in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Konnectors imports
import baseKonnector from '../../base_konnector'
import Bill from '../../../models/bill'
import Konnector from '../../../models/konnector'


const configConversion = function (configOptions) {
    let fields = {}

    Object.keys(configOptions).forEach((configName) => {
        // TODO: Handle int, float, bool, choices
        // TODO: Handle folder
        if (configOptions[configName].type === 'password') {
            fields[configName] = 'password'
        } else {
            fields[configName] = 'text'
        }
    })

    return fields
}


const capabalitiesToModels = function (capabilities) {
    let models = []

    capabilities.split(' ').forEach((capability) => {
        switch (capability) {
            case 'CapDocument':
                return models.push(Bill)

            case 'CapAccount':
            case 'CapAudio':
            case 'CapAudioStream':
            case 'CapBank':
            case 'CapBugTracker':
            case 'CapCalendarEvent':
            case 'CapChat':
            case 'CapCinema':
            case 'CapCollection':
            case 'CapContact':
            case 'CapContent':
            case 'CapDating':
            case 'CapFile':
            case 'CapGallery':
            case 'CapGauge':
            case 'CapGeolocIp':
            case 'CapHousing':
            case 'CapImage':
            case 'CapJob':
            case 'CapBook':
            case 'CapLyrics':
            case 'CapMessages':
            case 'CapMessagesPost':
            case 'CapParcel':
            case 'CapPaste':
            case 'CapPriceComparison':
            case 'CapRadio':
            case 'CapRecipe':
            case 'CapShop':
            case 'CapSubtitle':
            case 'CapTorrent':
            case 'CapTranslate':
            case 'CapTravel':
            case 'CapVideo':
            case 'CapWeather':
                // TODO: Not implemented
                return
        }
    })

    return models
}


const KonnectorConverters = {
    // Conversion functions for CapDocument items to Bill
    'modules': function (data) {  // Weboob type: Bill
        let parsedData = []
        data.forEach((module) => {
            let konnectorData = {
                name: module.name,
                vendorLink: module.website,
                fields: configConversion(module.config),
                models: capabalitiesToModels(module.capabilities),
                fetchOperations: []  // TODO
            }
            parsedData.push(baseKonnector.createNew(konnectorData))
        })
        return {
            cozyModel: Konnector,
            parsedData: parsedData
        };
    }
};
export default KonnectorConverters;
