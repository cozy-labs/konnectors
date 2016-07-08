baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'RunAbove CA'
slug = 'runabove_ca'

api =
    endpoint: 'runabove-ca'
    appKey: '6flmchEj8cORJnv9'
    appSecret: '6CzGLAmbfsFfrIIscN7QCgEQd3ka7t90'

connector = module.exports = baseOVHKonnector.createNew(api, name, slug)
