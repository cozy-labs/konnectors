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
        password = @model.get 'password'
        values ?= {}
        password ?= ""
        for name, val of @model.get 'fields'
            values[name] = "" unless values[name]?

            fieldHtml = """
<div class="field line">
<div><label for="#{slug}-#{name}-input">#{name}</label></div>
"""

            if val is 'folder'
                fieldHtml += """
<div><select id="#{slug}-#{name}-input"
             value="#{values[name]}"></select></div>
</div>
"""
            else if val is 'password'
                fieldHtml += """
<div><input id="#{slug}-#{name}-input" type="#{val}"
            value="#{password}"/></div>
</div>
"""
            else
                fieldHtml += """
<div><input id="#{slug}-#{name}-input" type="#{val}"
            value="#{values[name]}"/></div>
</div>
"""
            @$('.fields').append fieldHtml

    onImportClicked: =>
        fieldValues = {}
        slug = @model.get 'slug'

        for name, val of @model.get 'fields'
            if name is 'password'
                password = $("##{slug}-#{name}-input").val()
            else
                fieldValues[name] = $("##{slug}-#{name}-input").val()
        @model.set 'fieldValues', fieldValues
        @model.set 'password', password
        @model.save
            success: =>
                alert "import succeeded"
            error: =>
                alert "import failed"

    selectPath: =>
        slug = @model.get 'slug'
        for name, val of @model.get 'fields'
            if val is 'folder'
                values = @model.get 'fieldValues'
                values ?= {}
                @$("##{slug}-#{name}-input").val values[name]
