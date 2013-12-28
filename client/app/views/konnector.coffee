BaseView = require '../lib/base_view'

module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click .import-button": "onImportClicked"

    afterRender: =>
        fields = @model.get 'fields'
        for name, val of fields
            @$('.fields').append """
<div class="field line">
<div><label for="#{name}-input">#{name}</label></div>
<div><input type="text" class="#{name}-input" value="#{val}" /></div>
</div>
"""

    onImportClicked: =>
        fields = @model.get 'fields'
        for name, val of fields
            fields[name] = $(".#{name}-input").val()
        @model.set 'fields', fields
        @model.save
            success: =>
                alert "import succeeded"
            error: =>
                alert "import failed"
