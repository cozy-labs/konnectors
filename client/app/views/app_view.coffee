BaseView = require '../lib/base_view'
KonnectorView = require './konnector'
MenuView = require './menu'
request = require '../lib/request'

module.exports = class AppView extends BaseView

    el: 'body'
    template: require './templates/home'
    defaultTemplate: require './templates/default'
    events: 'click #menu-toggler': 'toggleMenu'


    subscriptions:
        'folders:create': 'onFolderRemoteCreate'
        'folders:update': 'onFolderRemoteUpdate'
        'folders:delete': 'onFolderRemoteDelete'


    constructor: (options) ->
        super options
        @folders = options.folders


    afterRender: ->
        @container = @$ '.container'

        @menuView = new MenuView collection: @collection
        @menuView.render()


    showDefault: ->
        @menuView.unselectAll()
        @container.html @defaultTemplate()
        @hideMenu()


    showKonnector: (slug) ->
        konnector = @collection.findWhere {slug}
        paths = @folders.getAllPaths()

        # removes existing view, if necessary
        @konnectorView.destroy() if @konnectorView?

        # removes default view, if necessary
        defaultView = @container.find '#default'
        if defaultView.length > 0
            @$('#menu-toggler').remove()
            defaultView.remove()

        if konnector?
            # renders and appends view
            @konnectorView = new KonnectorView
                model: konnector
                paths: paths
            el = @konnectorView.render().$el
            @$('.container').append el

            # mark as selected in the menu
            @menuView.unselectAll()
            @menuView.selectItem konnector.cid

            @hideMenu()
        else
            # if the connector doesn't exist, redirects to home page
            window.router.navigate '', true


    toggleMenu: ->
        @$('#menu').toggleClass 'active'


    hideMenu: ->
        @$('#menu').removeClass 'active'


    # When a folder is created remotely, it updates the current konnector view
    # to show changes in the folder list selector.
    onFolderRemoteCreate: (model) ->
        @folders.add model
        @konnectorView.paths = @folders.getAllPaths()
        @konnectorView.render()


    # When a folder is updated remotely, it updates the current konnector view
    # to show changes in the folder list selector.
    onFolderRemoteUpdate: (model) ->
        if model?
            @folders.add model, merge: true
            @konnectorView.paths = @folders.getAllPaths()
            @konnectorView.render()


    # When a folder is deleted remotely, it updates the current konnector view
    # to show changes in the folder list selector.
    onFolderRemoteDelete: (model) ->
        @folders.remove model
        @konnectorView.paths = @folders.getAllPaths()
        @konnectorView.render()

