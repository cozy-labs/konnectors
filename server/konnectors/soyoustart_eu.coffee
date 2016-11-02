baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'SoYouStart EU'
slug = 'soyoustart_eu'
link = 'www.soyoustart.com'

category = 'host_provider'
color =
    hex: '#9DC51C'
    css: '#9DC51C'

api =
    endpoint: 'soyoustart-eu'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
