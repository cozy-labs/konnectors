request = require '../lib/request'
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

    fetch: ->
        @collection.fetch
            success: =>
                request.get 'folders', (err, paths) =>
                    for path in paths
                        $(".folder").append """
                        <option value="#{path}">#{path}</option>
                        """

                    for cid, konnector of @views
                        konnector.selectPath()
