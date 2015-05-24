module.exports = class KonnectorCollection extends Backbone.Collection
    model: require '../models/konnector'
    url: 'konnectors/'

    comparator: (a, b) ->

        # configured konnectors first
        if a.isConfigured() and not b.isConfigured()
            return -1
        else if not a.isConfigured() and b.isConfigured()
            return 1

        # then sort by name
        else if a.get('name') > b.get('name')
            return 1
        else if a.get('name') < b.get('name')
            return -1
        else
            return 0
