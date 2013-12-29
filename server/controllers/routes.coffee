# See documentation on https://github.com/frankrousseau/americano#routes

konnectors = require './konnectors'

module.exports =
    'konnectorId':
        param: konnectors.getKonnector

    'konnectors':
        get: konnectors.all

    'konnectors/:konnectorId':
        get: konnectors.show
        put: konnectors.import
