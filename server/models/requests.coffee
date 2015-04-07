# See documentation on https://github.com/frankrousseau/americano-cozy/#requests

americano = require 'americano'

module.exports =
    konnector:
        all: americano.defaultRequests.all

    bankoperation:
        byDate: (doc) ->
            emit doc.date, doc
