americano = require 'americano-cozy'


module.exports = Konnector = americano.getModel 'Konnector',
    name: String
    slug: String
    description: String
    vendorLink: String
    fields: Object
    fieldValues: Object
    modelNames: Object
    lastImport: Date
    isImporting: type: Boolean, default: false


Konnector.all = (callback) ->
    Konnector.request 'all', callback
