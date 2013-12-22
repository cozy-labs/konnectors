# See documentation on https://github.com/frankrousseau/americano#routes

konnectors = require './konnectors'

module.exports =
    'konnectors':
        get: konnectors.all
