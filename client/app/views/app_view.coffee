BaseView = require '../lib/base_view'
KonnectorView = require './konnector'
MenuView = require './menu'

module.exports = class AppView extends BaseView

    el: 'body'
    template: require './templates/home'
    defaultTemplate: require './templates/default'
    events: 'click #menu-toggler': 'toggleMenu'

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
                paths: @paths
            el = @konnectorView.render().$el
            @$('.container').append el

            # mark as selected in the menu
            @menuView.unselectAll()
            @menuView.selectItem konnector.cid

            @hideMenu()
        else
            # if the connector doesn't exist, redirects to home page
            window.router.navigate '', true


    setFolders: (paths) -> @paths = paths


    toggleMenu: -> @$('#menu').toggleClass 'active'


    hideMenu: -> @$('#menu').removeClass 'active'

