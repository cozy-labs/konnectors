/**
 * Converters between exported data and available models in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Import converters
import BillConverters from './Bill'
import KonnectorConverters from './Konnector'

// Export global converters object
const Converters = {
    'Bill': BillConverters,
    'Konnector': KonnectorConverters
};

export default Converters;
