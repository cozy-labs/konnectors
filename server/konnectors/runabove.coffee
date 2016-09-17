baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Runabove'
slug = 'runabove'
link = 'runabove.com'
api =
    # Looks like the endpont is suffxied by -ca even for europe
    endpoint: 'runabove-ca'
    appKey: '6flmchEj8cORJnv9'
    appSecret: '6CzGLAmbfsFfrIIscN7QCgEQd3ka7t90'

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)
