baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Kimsufi CA'
slug = 'kimsufi_ca'
link = 'kimsufi.com'

category = 'host_provider'
color =
    hex: '#3E669C'
    css: '#3E669C'

api =
    endpoint: 'kimsufi-ca'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
