ViewCollection = require '../lib/view_collection'
MenuItemView = require './menu_item'

module.exports = class KonnectorsView extends ViewCollection
    collectionEl: '#konnectors'

    itemview: MenuItemView

    initialize: (options) ->
        super options
        @listenTo @collection, 'change', @collection.sort.bind(@collection)
        @listenTo @collection, 'change', @render


    afterRender: ->
        super()
        @selectItem @selectedCid


    selectItem: (modelCid) ->
        @selectedCid = modelCid
        view = @views[modelCid]
        view.select() if view?


    unselectAll: ->
        view.unselect() for index, view of @views

