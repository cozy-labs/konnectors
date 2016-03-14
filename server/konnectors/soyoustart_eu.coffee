baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'SoYouStart EU'
slug = 'soyoustart_eu'

api =
    endpoint: 'soyoustart-eu'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(api, name, slug)

