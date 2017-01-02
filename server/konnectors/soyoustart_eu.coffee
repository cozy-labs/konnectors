baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'SoYouStart EU'
slug = 'soyoustart_eu'
link = 'www.soyoustart.com'

api =
    endpoint: 'soyoustart-eu'
    appKey: 'kuioqDT4j2Ouse1e'
    appSecret: '3q7hbodiQCVA5qze3ZLtA1qFlOemNJjP'

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)
