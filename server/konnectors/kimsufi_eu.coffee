baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Kimsufi EU'
slug = 'kimsufi_eu'
link = 'kimsufi.com'

category = 'host_provider'
color =
    hex: '#3E669C'
    css: '#3E669C'

api =
    endpoint: 'kimsufi-eu'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
