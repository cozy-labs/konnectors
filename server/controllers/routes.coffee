# See documentation on https://github.com/frankrousseau/americano#routes

konnectors = require './konnectors'
folders = require './folders'
index = require './index'

module.exports =
    '':
        get: index.main

    'konnectorId':
        param: konnectors.getKonnector

    'konnectors/:konnectorId':
        get: konnectors.show
        put: konnectors.import
        delete: konnectors.remove

    'folders':
        get: folders.all

    'folders/:folderId':
        get: folders.show

