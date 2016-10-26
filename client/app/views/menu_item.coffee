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


    # Change style if the konnector was configured by the user.
    afterRender: ->
        @$el.addClass 'configured' if @model.isConfigured()
        @$el.addClass @model.get 'slug' # required to manage icon.


    select: ->
        @$el.addClass 'selected'


    unselect: ->
        @$el.removeClass 'selected'

