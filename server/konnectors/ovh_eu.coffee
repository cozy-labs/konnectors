baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'OVH EU'
slug = 'ovh_eu'
link = 'ovh.com'

category = 'host_provider'
color =
    hex: '#264670'
    css: '#264670'

api =
    endpoint: 'ovh-eu'
    appKey: 'aAPF1nke1brRoK5H'
    appSecret: 'tVLYsO69677lcUksuXgV3dfegY68R6s9'

connector = module.exports = baseOVHKonnector.createNew(
    api, name, slug, link, category, color
)
