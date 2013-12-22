ViewCollection = require '../lib/view_collection'
KonnectorsCollection = require '../collections/konnectors'
KonnectorView = require './konnector'

module.exports = class KonnectorsView extends ViewCollection
    el: '#konnectors'

    collection: new KonnectorsCollection()
    itemview: KonnectorView

    afterRender: ->
        @collection.on 'reset', =>
            @renderAll()
        @collection.on 'add', (model) =>
            @renderOne model
