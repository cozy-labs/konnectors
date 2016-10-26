BaseView = require '../lib/base_view'
KonnectorView = require './konnector'
MenuView = require './menu'
request = require '../lib/request'


# Main view that handles the UI regions.
module.exports = class AppView extends BaseView

    el: 'body'
    template: require './templates/home'
    defaultTemplate: require './templates/default'
    events:
        'click #menu-toggler': 'toggleMenu'


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


    # Show default splash screen with explanation about what the Konnector app
    # is.
    showDefault: ->
        @menuView.unselectAll()
        @container.html @defaultTemplate()
        @hideMenu()


    toggleMenu: ->
        @$('#menu').toggleClass 'active'


    hideMenu: ->
        @$('#menu').removeClass 'active'


    #  Display konnector corresponding to given slug.
    showKonnector: (slug) ->
        konnector = @collection.findWhere {slug}

        # If the konnector exists, display its view.
        if konnector?
            @cleanCurrentView()

            # renders and appends view
            paths = @folders.getAllPaths()
            @konnectorView = new KonnectorView
                model: konnector
                paths: paths
            el = @konnectorView.render().$el
            @$('.container').append el

            # Mark as selected in the menu
            @menuView.unselectAll()
            @menuView.selectItem konnector.cid

            @hideMenu()
        else
            # if the connector doesn't exist, redirects to home page
            window.router.navigate '', true


    # Remove from DOM currently displayed konnector or splash screen.
    cleanCurrentView: ->

        # Removes current konnector view.
        @konnectorView.destroy() if @konnectorView?

        # Removes default view.
        defaultView = @container.find '#default'
        if defaultView.length > 0
            @$('#menu-toggler').remove()
            defaultView.remove()


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

