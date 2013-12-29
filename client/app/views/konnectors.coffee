ViewCollection = require '../lib/view_collection'
KonnectorsCollection = require '../collections/konnectors'
KonnectorView = require './konnector'
KonnectorListener = require './konnector_listener'

module.exports = class KonnectorsView extends ViewCollection
    collectionEl: '#konnectors'

    collection: new KonnectorsCollection()
    itemview: KonnectorView

    afterRender: ->
        super

        @remoteChangeListener = new KonnectorListener()
        @remoteChangeListener.watch @collection
