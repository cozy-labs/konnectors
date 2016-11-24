baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'Kimsufi EU'
slug = 'kimsufi_eu'
link = 'kimsufi.com'

api =
    endpoint: 'kimsufi-eu'
    appKey: '00Q53g7zU6ktWgNP'
    appSecret: '4KJTPUU43lhrxQ2XFGgG3FJSVDuVkC3P'

connector = module.exports = baseOVHKonnector.createNew(api, name, slug, link)

