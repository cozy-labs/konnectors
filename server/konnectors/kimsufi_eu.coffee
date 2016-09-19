baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Kimsufi EU'
slug = 'kimsufi_eu'
link = 'kimsufi.com'

api =
    endpoint: 'kimsufi-eu'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)

