# See documentation on https://github.com/frankrousseau/americano-cozy/#requests

americano = require 'americano'

module.exports =
    bill:
        byDate: americano.defaultRequests.by 'date'

    konnector:
        all: americano.defaultRequests.all

    bankoperation:
        byDate: americano.defaultRequests.by 'date'

    folder:
        byFullPath: (doc) -> emit "#{doc.path}/#{doc.name}", doc
