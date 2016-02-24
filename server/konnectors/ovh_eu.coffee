baseOVHKonnector = require '../lib/base_ovh_konnector'

name = 'OVH EU'
slug = 'ovh_eu'

api =
    endpoint: 'ovh-eu'
    appKey: 'zCqczKQV3Ka7ML2F'
    appSecret: 'hVLSCmpmiLOQxrDCgzerKPly0RciWY7K'

connector = module.exports = baseOVHKonnector.createNew(api, name, slug)
