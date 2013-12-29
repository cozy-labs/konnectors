BaseView = require '../lib/base_view'

module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click .import-button": "onImportClicked"

    afterRender: =>
        values = @model.get 'fieldValues'
        values ?= {}
        for name, val of @model.get 'fields'
            values[name] = "" unless values[name]?

            @$('.fields').append """
<div class="field line">
<div><label for="#{name}-input">#{name}</label></div>
<div><input class="#{name}-input" type="#{val}"
            value="#{values[name]}"/></div>
</div>
"""

    onImportClicked: =>
        fieldValues = {}
        for name, val of @model.get 'fields'
            fieldValues[name] = $(".#{name}-input").val()
        @model.set 'fieldValues', fieldValues
        @model.save
            success: =>
                alert "import succeeded"
            error: =>
                alert "import failed"
