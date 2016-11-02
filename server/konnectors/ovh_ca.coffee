baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'OVH CA'
slug = 'ovh_ca'
link = 'ovh.com'

category = 'host_provider'
color =
    hex: '#264670'
    css: '#264670'

api =
    endpoint: 'ovh-ca'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
