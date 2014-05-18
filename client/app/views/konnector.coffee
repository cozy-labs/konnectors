BaseView = require '../lib/base_view'

module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click .import-button": "onImportClicked"

    afterRender: =>
        slug = @model.get 'slug'
        lastImport = @model.get 'lastImport'
        isImporting  = @model.get 'isImporting'

        @$el.addClass "konnector-#{slug}"

        if isImporting
            @$('.last-import').html 'importing...'
        else if lastImport?
            @$('.last-import').html moment(lastImport).format 'LLL'
        else
            @$('.last-import').html "no import performed."

        values = @model.get 'fieldValues'
        values ?= {}
        for name, val of @model.get 'fields'
            values[name] = "" unless values[name]?

            @$('.fields').append """
<div class="field line">
<div><label for="#{slug}-#{name}-input">#{name}</label></div>
<div><input id="#{slug}-#{name}-input" type="#{val}"
            value="#{values[name]}"/></div>
</div>
"""

    onImportClicked: =>
        fieldValues = {}
        slug = @model.get 'slug'

        for name, val of @model.get 'fields'
            fieldValues[name] = $("##{slug}-#{name}-input").val()
        @model.set 'fieldValues', fieldValues
        @model.save
            success: =>
                alert "import succeeded"
            error: =>
                alert "import failed"
