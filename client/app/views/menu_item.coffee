BaseView = require '../lib/base_view'

module.exports = class MenuItemView extends BaseView

    tagName: 'li'
    template: require './templates/menu_item'


    initialize: (options) ->
        super options
        @listenTo @model, 'change', @render


    getRenderData: ->
        lastImport = @model.get 'lastImport'
        if @model.isConfigured() and lastImport?
            formattedDate = moment(lastImport).format t('date format')
            lastImport = "#{t 'last import:'}  #{formattedDate}"
        else if @model.isConfigured()
            lastImport = t "no import performed"
        else
            lastImport = ""

        return _.extend {}, super(), {lastImport}

    afterRender: ->
        # change style if the konnector is used by the user
        if @model.isConfigured()
            @$el.addClass 'configured'


    select: -> @$el.addClass 'selected'


    unselect: -> @$el.removeClass 'selected'
