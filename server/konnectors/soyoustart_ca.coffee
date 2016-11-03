baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'SoYouStart CA'
slug = 'soyoustart_ca'
link = 'www.soyoustart.com'

category = 'host_provider'
color =
    hex: '#9DC51C'
    css: '#9DC51C'

api =
    endpoint: 'soyoustart-ca'
    appKey: ''
    appSecret: ''

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
