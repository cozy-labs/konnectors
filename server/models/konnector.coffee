americano = require 'americano-cozy'


module.exports = Konnector = americano.getModel 'Konnector',
    name: String
    description: String
    fields: Object
    status: String
    infos: String


Konnector.all = (callback) ->
    Konnector.request 'all', callback
