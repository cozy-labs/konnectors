BaseView = require 'lib/base_view'

# View that display a collection of subitems
# used to DRY views
# Usage : new ViewCollection(collection:collection)
# Automatically populate itself by creating a itemView for each item
# in its collection

# can use a template that will be displayed alongside the itemViews

# itemView       : the Backbone.View to be used for items
# itemViewOptions : the options that will be passed to itemViews
# collectionEl : the DOM element's selector where the itemViews will
#                be displayed. Automatically falls back to el if null

module.exports = class ViewCollection extends BaseView

    itemview: null

    views: {}

    template: -> ''

    itemViewOptions: ->

    collectionEl: null


    # Add 'empty' class to view when there is no subview.
    onChange: ->
        @$el.toggleClass 'empty', _.size(@views) is 0


    # Append view after all others.
    # Can be overriden if we want to place the subviews somewhere else.
    appendView: (view) ->
        @$collectionEl.append view.el


    # Bind listeners to the collection.
    initialize: ->
        super
        @views = {}
        @listenTo @collection, 'reset',   @onReset
        @listenTo @collection, 'add',     @addItem
        @listenTo @collection, 'remove',  @removeItem
        @listenTo @collection, 'sort',    @render

        @$collectionEl = $ @collectionEl


    # If we have views before a render call, we detach them.
    render: ->
        view.$el.detach() for id, view of @views
        super


    # After render, we reattach the views.
    afterRender: ->
        @appendView view.$el for id, view of @views
        @onReset @collection
        @onChange @views


    # Destroy all sub views before remove.
    remove: ->
        @onReset []
        super


    # When reset it removes all view and add an item for each model of the
    # new collection to handle.
    onReset: (newcollection) ->
        view.remove() for id, view of @views
        newcollection.forEach @addItem


    # When a model is added, a new view is created and that view pointer is
    # stored in a hash where key is the model CID.
    addItem: (model) =>
        options = _.extend {}, {model: model}, @itemViewOptions(model)
        view = new @itemview(options)
        @views[model.cid] = view.render()
        @appendView view
        @onChange @views


    # When a model is removed, its view is removed from the DOM and from the
    # view hash.
    removeItem: (model) =>
        @views[model.cid].remove()
        delete @views[model.cid]

        @onChange @views


    # Run fetch method of linked collection.
    fetch: (options) =>
        @collection.fetch options

