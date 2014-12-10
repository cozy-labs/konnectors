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

            fieldHtml = """
<div class="field line">
<div><label for="#{slug}-#{name}-input">#{name}</label></div>
"""

            if val is 'folder'
                fieldHtml += """
<div><select id="#{slug}-#{name}-input" class="folder"
             value="#{values[name]}"></select></div>
</div>
"""
            else
                fieldHtml += """
<div><input id="#{slug}-#{name}-input" type="#{val}"
            value="#{values[name]}"/></div>
</div>
"""
            @$('.fields').append fieldHtml

        # Auto Import
        importInterval = @model.get 'importInterval'
        importInterval ?= ''
        intervals = {none: "None", hour: "Every Hour", day: "Every Day", week: "Every Week", month: "Each month"}
        fieldHtml = """
<div class="field line">
<div><label for="#{slug}-autoimport-input">Auto Import</label></div>
<div><select id="#{slug}-autoimport-input" class="autoimport">
"""
        for key, value of intervals
            selected = if importInterval is key then 'selected' else ''
            fieldHtml += "<option value=\"#{key}\" #{selected}>#{value}</option>"

        fieldHtml += """

</select>
<span id="#{slug}-first-import">
<span id="#{slug}-first-import-text">
<a id="#{slug}-first-import-link" href="#">Select a starting date</a></span>
<span id="#{slug}-first-import-date"><span>Date</span>
<input id="#{slug}-import-date" class="autoimport" maxlength="8" type="text"></input>
</span></span>
</div>
</div>
"""
        @$('.fields').append fieldHtml
        if @$("##{slug}-autoimport-input").val() isnt 'none'
            @$("##{slug}-first-import").show()
        else
            @$("##{slug}-first-import").hide()
        @$("##{slug}-first-import-date").hide()
        @$("##{slug}-import-date").datepicker({minDate: 1, dateFormat: "dd-mm-yy" })
        @$("##{slug}-first-import-link").click (event) =>
            event.preventDefault()
            @$("##{slug}-first-import-date").show()
            @$("##{slug}-first-import-text").hide()
        @$("##{slug}-autoimport-input").change =>
            if @$("##{slug}-autoimport-input").val() isnt 'none'
                @$("##{slug}-first-import").show()
            else
                @$("##{slug}-first-import").hide()

    onImportClicked: =>
        fieldValues = {}
        slug = @model.get 'slug'

        importDate = $("##{slug}-import-date").val()
        fieldValues['date'] = importDate

        for name, val of @model.get 'fields'
            fieldValues[name] = $("##{slug}-#{name}-input").val()
        @model.set 'fieldValues', fieldValues
        importInterval = 'none'
        importInterval = $("##{slug}-autoimport-input").val()

        @model.set 'importInterval', importInterval
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
