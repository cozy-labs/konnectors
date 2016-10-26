
module.exports = class Router extends Backbone.Router

    routes:
        '': 'main'
        'konnector/:slug': 'konnector'


    initialize: (options) ->
        super()
        @appView = options.appView


    main: ->
        @appView.showDefault()


    konnector: (slug) ->
        @appView.showKonnector slug

