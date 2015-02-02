BaseView = require '../lib/base_view'

module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click #import-button": "onImportClicked"

    initialize: (options) ->
        super options
        @paths = options.paths or []
        @listenTo @model, 'change', @render

    afterRender: =>
        slug = @model.get 'slug'
        lastImport = @model.get 'lastImport'
        isImporting  = @model.get 'isImporting'
        lastAutoImport = @model.get 'lastAutoImport'
        @error = @$ '.error'
        if not @model.get('errorMessage')? or isImporting
            @error.hide()

        @$el.addClass "konnector-#{slug}"

        if isImporting
            @$('.last-import').html t('importing...')
            @disableImportButton()

        else if lastImport?
            formattedDate = moment(lastImport).format t('date format')
            @$('.last-import').html formattedDate
            @enableImportButton()
        else
            @$('.last-import').html t("no import performed")
            @enableImportButton()

        values = @model.get 'fieldValues'

        values ?= {}
        for name, val of @model.get 'fields'
            values[name] = "" unless values[name]?

            fieldHtml = """
<div class="field line">
<div><label for="#{slug}-#{name}-input">#{t(name)}</label></div>
"""
            if val is 'folder'
                fieldHtml += """
<div><select id="#{slug}-#{name}-input" class="folder"">"""
                for path in @paths
                    if path is values[name]
                        fieldHtml += """<option selected value="#{path}">#{path}</option>"""
                    else
                        fieldHtml += """<option value="#{path}">#{path}</option>"""
                fieldHtml += "</select></div></div>"

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
        intervals = {none: t("none"), hour: t("every hour"), day: t("every day"), week: t("every week"), month: t("each month")}
        fieldHtml = """
<div class="field line">
<div><label for="#{slug}-autoimport-input">#{t 'auto import'}</label></div>
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
<span id="#{slug}-first-import-date"><span>From</span>
<input id="#{slug}-import-date" class="autoimport" maxlength="8" type="text"></input>
</span></span>
</div>
</div>
"""
        @$('.fields').append fieldHtml

        @$("##{slug}-first-import-date").hide()
        @$("##{slug}-import-date").datepicker({minDate: 1, dateFormat: "dd-mm-yy" })

        # if auto-importation is set to day, week, or month
        if @$("##{slug}-autoimport-input").val() isnt 'none' \
        and @$("##{slug}-autoimport-input").val() isnt 'hour'

            # Only show the date if the first import didn't happened yet
            if lastAutoImport? and moment(lastAutoImport).valueOf() > moment().valueOf()
                @$("##{slug}-first-import-date").show()
                @$("##{slug}-first-import-text").hide()
                @$("##{slug}-import-date").val(moment(lastAutoImport).format 'DD-MM-YYYY')
            else
                @$("##{slug}-first-import").show()
        else
            @$("##{slug}-first-import").hide()

        @$("##{slug}-first-import-link").click (event) =>
            event.preventDefault()
            @$("##{slug}-first-import-date").show()
            @$("##{slug}-first-import-text").hide()

        @$("##{slug}-autoimport-input").change =>
            if @$("##{slug}-autoimport-input").val() isnt 'none' \
            and @$("##{slug}-autoimport-input").val() isnt 'hour'
                @$("##{slug}-first-import").show()
            else
                @$("##{slug}-first-import").hide()

    disableImportButton: ->
        @$('#import-button').attr 'aria-busy', true
        @$('#import-button').attr 'aria-disabled', true

    enableImportButton: ->
        @$('#import-button').attr 'aria-busy', false
        @$('#import-button').attr 'aria-disabled', false

    onImportClicked: ->
        # don't restart the import if an import is running
        unless @model.get('isImporting')
            @$('.error').hide()

            # get the field values from inputs
            fieldValues = {}
            slug = @model.get 'slug'
            importDate = $("##{slug}-import-date").val()
            fieldValues['date'] = importDate
            for name, val of @model.get 'fields'
                fieldValues[name] = $("##{slug}-#{name}-input").val()

            # auto import interval and start date work separately from field
            # values
            importInterval = $("##{slug}-autoimport-input").val()

            # disable the button when it's being clicked, realtime changes will
            # re-enable it when necessary.
            @disableImportButton()

            # save field values and start importing
            data = {fieldValues, importInterval}
            @model.save data,
                success: (model, success) =>
                error: (model, err) =>
                    # cozycloud.cc timeout is not considered like an error
                    if err.status >= 400 and err.status isnt 504
                        @$('.error .message').html t(err.responseText)
                        @$('.error').show()
