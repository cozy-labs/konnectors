/**
 * Converters between exported data and Bill model in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Konnectors imports
import baseKonnector from '../../base_konnector'
import KonnectorModel from '../../../models/konnector'


const KonnectorConverters = {
    // Conversion functions for CapDocument items to Bill
    'modules': function (data) {  // Weboob type: Bill
        let parsedData = []
        data.forEach((module) => {
            let konnectorData = {
                name: module.name,
                vendorLink: module.website,
                fields: {},  // TODO
                models: [],  // TODO
                fetchOperations: []  // TODO
            }
            parsedData.push(baseKonnector.createNew(konnectorData))
        })
        return {
            cozyModel: KonnectorModel,
            parsedData: parsedData
        };
    }
};
export default KonnectorConverters;
