baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'SoYouStart EU'
slug = 'soyoustart_eu'
link = 'www.soyoustart.com'

api =
    endpoint: 'soyoustart-eu'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)

