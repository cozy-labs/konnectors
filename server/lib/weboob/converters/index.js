/**
 * Converters between exported data and available models in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// Import converters
import BillConverters from './Bill'

// NOTE: We voluntarily keep Konnector converter out of this export, to avoid
// circular dependency

// Export global converters object
const Converters = {
    'Bill': BillConverters
};

export default Converters;
