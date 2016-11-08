/**
 * Converters between exported data and Bill model in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Local imports
import Converters from './index'
import WeboobFetcher from '../WeboobFetcher'

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


const capabilitiesToModels = function (capabilities) {
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
            default:
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
            /**
             * Build description of modules to run for Cozyweboob
             */
            const _buildModulesDescription = function (requiredFields, entries, data, next) {
                data.modulesDescription = {
                    // We call a single time each module, so name is a valid id
                    id: module.name,
                    name: module.name,
                    parameters: {
                        // Filled right after
                    },
                    actions: {
                        fetch: true,
                        download: true
                    }
                }
                Object.keys(requiredFields).forEach(field => {
                    data.modulesDescription[field] = requiredFields[field]
                })
                return next()
            }
            /**
             * Fetch data using CozyWeboob
             */
            const _fetchData = function (requiredFields, entries, data, next) {
                data.client = WeboobFetcher()
                return data.client.fetch(
                    JSON.stringify(data.modulesDescription),
                    (response) => { data.rawEntries = response; return next() }
                )
            }
            /**
             * Parse the returned data and create matching Cozy models
             */
            const _parseData = function (requiredFields, entries, data, next) {
                data.parsedEntries = {};
                Object.keys(data.rawEntries).forEach(function (moduleName) {
                    let moduleData = data.rawEntries[moduleName];
                    Object.keys(moduleData).forEach(function (weboobType) {
                        if (Converters[weboobType] === undefined) {
                            return;
                        }
                        let fieldData = moduleData[weboobType];
                        let downloaded_documents = moduleData.downloaded;
                        // Convert all the available entries and store them in parsed
                        // entries
                        let { cozyModel, parsedData } = Converters[weboobType](
                            fieldData,
                            moduleName,
                            downloaded_documents
                        );
                        if (cozyModel !== undefined && parsedData !== undefined) {
                            data.parsedEntries[cozyModel] = [].concat(
                                data.parsedEntries[cozyModel] || [],
                                parsedData
                            );
                        }
                    });
                });
                return next()
            }
            const _customFilterExisting = function (requiredFields, entries, data, next) {
                // TODO
                return next()
            }
            const _customSaveDataAndFile = function (requiredFields, entries, data, next) {
                // TODO
                return next()
            }
            /**
             * Clean temporary created files
             */
            const _clean = function (requiredFields, entries, data, next) {
                // TODO: Should not be ran while another Weboob-based konnector is running!
                return data.client.clean(next)
            }
            /**
             * Close conversation with CozyWeboob
             */
            const _close = function (requiredFields, entries, data, next) {
                return data.client.exit(next)
            }
            const _buildNotificationContent = function (requiredFields, entries, data, next) {
                // TODO
                return next()
            }
            let konnectorData = {
                name: module.name,
                vendorLink: module.website,
                fields: configConversion(module.config),
                models: capabilitiesToModels(module.capabilities),
                fetchOperations: [
                    _buildModulesDescription,
                    _fetchData,
                    _parseData,
                    _customFilterExisting,
                    _customSaveDataAndFile,
                    _clean,
                    _close,
                    _buildNotificationContent
                ]
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
