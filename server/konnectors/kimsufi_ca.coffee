baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Kimsufi CA'
slug = 'kimsufi_ca'
link = 'kimsufi.com'

api =
    endpoint: 'kimsufi-ca'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)

