/**
 * Converters between exported data and Bill model in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Local imports
import Converters from './index'
import WeboobFetcher from '../WeboobFetcher'
import filterExisting from '../../filter_existing'
import saveDataAndFile from '../../save_data_and_file'

// Konnectors imports
import baseKonnector from '../../base_konnector'
import Bill from '../../../models/bill'
import Konnector from '../../../models/konnector'


const configConversion = function (configOptions) {
    let fields = {}

    Object.keys(configOptions).forEach((configName) => {
        // TODO[Phyks] Handle float, bool, choices
        if (configOptions[configName].type === 'password') {
            fields[configName] = 'password'
        } else if (configOptions[configName].type === 'int') {
            // Number HTML5 input type
            fields[configName] = 'number'
        }else {
            fields[configName] = 'text'
        }
    })

    return fields
}


/**
 * Generate a list of models output by the connector depending on the
 * associated capabilities.
 *
 * Also generate extra necessary config options, such as folderPath to store
 * output documents.
 */
const capabilitiesToModelsAndConfig = function (capabilities) {
    let models = []
    let extraConfig = {}

    capabilities.split(' ').forEach((capability) => {
        switch (capability) {
            case 'CapDocument':
                // This capability will download documents, we need to specify
                // this extra config field
                extraConfig['folderPath'] = 'folder'
                // And it will fetch Bill model
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
                // TODO[Phyks]: Not implemented
                return
        }
    })

    return {
        models: models,
        extraConfig: extraConfig
    }
}


const KonnectorConverters = {
    // Conversion functions for CapDocument items to Bill
    'modules': function (data) {  // Weboob type: Bill
        let parsedData = []

        data.forEach((module) => {
            const { models, extraConfig } = capabilitiesToModelsAndConfig(module.capabilities);
            let konnectorData = baseKonnector.createNew({
                name: module.name,
                vendorLink: module.website,
                fields: Object.assign(
                    {}, configConversion(module.config), extraConfig),
                models: models,
                fetchOperations: [
                    // Filled right afterwards
                ],
                isWeboob: true  // This konnector is backed by Weboob
            })

            /**
             * Build description of modules to run for Cozyweboob
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                konnectorData.logger.info('Building modules description...')
                // Store the modules description in data field
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
                    // Fill in fields
                    data.modulesDescription[field] = requiredFields[field]
                })
                konnectorData.logger.info('Done building modules description!')
                return next()
            })

            /**
             * Fetch data using CozyWeboob
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                konnectorData.logger.info('Fetching data...')
                // Fetch using weboob fetcher
                data.client = WeboobFetcher()
                return data.client.fetch(
                    JSON.stringify(data.modulesDescription),
                    (response) => {
                        // Store fetched data in data field
                        konnectorData.logger.info('Done fetching data!')
                        data.rawEntries = response;
                        return next()
                    }
                )
            })
            /**
             * Parse the returned data and create matching Cozy models
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                konnectorData.logger.info('Parsing data...')
                data.parsedEntries = {};
                // This follows the structure of the output JSON from cozyweboob
                Object.keys(data.rawEntries).forEach(function (moduleName) {
                    let moduleData = data.rawEntries[moduleName];
                    Object.keys(moduleData).forEach(function (weboobType) {
                        // Try to call a matching Converter to convert from
                        // cozyweboob (weboob) types and cozy models
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
                konnectorData.logger.info('Done parsing data!')
                return next()
            })
            /**
             * Filter out pre-existing entries
             *
             * Note: filterExisting only operates on a given Cozy model, so we
             * have to loop on all supported Cozy models and create a
             * specialized layer for each of them
             */
            Object.keys(Converters).forEach((model) => {
                konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                    konnectorData.logger.info(`Filtering out existing ${model}...`)
                    // Ensure data.filterExisting exists
                    if (!data.filterExisting) {
                        data.filterExisting = {}
                    }
                    // Prepare a fake entries variable for filterExisting to
                    // operate on
                    let filterExistingInput = {
                        fetched: data.parsedEntries[model]
                    }
                    // Call filterExisting
                    return filterExisting(konnectorData.logger, model) (
                        requiredFields,
                        filterExistingInput,
                        data,
                        () => {
                            konnectorData.logger.info(`Done filtering out existing ${model}!`)
                            // Store filtered entities in data field
                            data.filteredEntities[model] = {}  // TODO[Phyks]
                            return next()
                        }
                    )
                })
            })
            /**
             * Save data and associated files
             *
             * Note: saveDataAndFile only operates on a given Cozy model, so we
             * have to loop on all supported Cozy models and create a
             * specialized layer for each of them
             */
            Object.keys(Converters).forEach((model) => {
                konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                    konnectorData.logger.info('Saving all data and associated files...')
                    // Prepare a fake entries variable for saveDataAndFile to
                    // operate on
                    let saveDataAndFileInput = {
                        filtered: data.filteredEntities[model]
                    }
                    // Call saveDataAndFile
                    const options = {}  // TODO[Phyks]
                    const tags = []  // TODO[Phyks]
                    return saveDataAndFile(konnectorData.logger, model, options, tags) (
                        requiredFields,
                        saveDataAndFileInput,
                        data,
                        () => {
                            konnectorData.logger.info('Done saving all data and associated files!')
                            return next()
                        }
                    )
                })
            })
            /**
             * Clean temporary created files
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                konnectorData.logger.info('Cleaning all temporary files from cozyweboob...')
                // TODO[Phyks] Should not be ran while another Weboob-based konnector is running!
                return data.client.clean(() => {
                    konnectorData.logger.info('Done cleaning all temporary files from cozyweboob!')
                    return next()
                })
            })
            /**
             * Close conversation with CozyWeboob
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                konnectorData.logger.info('Closing communication with cozyweboob...')
                return data.client.exit(() => {
                    konnectorData.logger.info('Communication with cozyweboob closed!')
                    return next()
                })
            })
            /**
             * Build notifications
             */
            konnectorData.fetchOperations.push(function (requiredFields, entries, data, next) {
                // TODO[Phyks]
                return next()
            })

            // Restore this created Konnector
            parsedData.push(konnectorData)
        })
        return {
            cozyModel: Konnector,
            parsedData: parsedData
        };
    }
};
export default KonnectorConverters;
