americano = require 'americano-cozy'

# Required to get locale and domain data.
module.exports = CozyInstance = americano.getModel 'CozyInstance',
    id: String
    domain: String
    locale : String


CozyInstance.first = (callback) ->
    CozyInstance.request 'all', (err, instances) ->
        if err then callback err
        else if not instances or instances.length is 0 then callback null, null
        else callback null, instances[0]


CozyInstance.getLocale = (callback) ->
    CozyInstance.request 'all', (err, instances) ->
        console.log err if err
        callback null, instances?[0]?.locale or 'en'


CozyInstance.getURL = (callback) ->
    CozyInstance.first (err, instance) ->
        if err then callback err
        else if instance?.domain
            url = instance.domain
            .replace('http://', '')
            .replace('https://', '')
            callback null, "https://#{url}/"
        else
            callback new Error 'No instance domain set'
