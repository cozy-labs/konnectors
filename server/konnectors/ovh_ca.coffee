baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'OVH CA'
slug = 'ovh_ca'
link = 'ovh.com'

api =
    endpoint: 'ovh-ca'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)

