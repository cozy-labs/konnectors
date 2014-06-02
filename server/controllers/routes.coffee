# See documentation on https://github.com/frankrousseau/americano#routes

konnectors = require './konnectors'
folders = require './folders'

module.exports =
    'konnectorId':
        param: konnectors.getKonnector

    'konnectors':
        get: konnectors.all

    'konnectors/:konnectorId':
        get: konnectors.show
        put: konnectors.import

    'folders':
        get: folders.all
