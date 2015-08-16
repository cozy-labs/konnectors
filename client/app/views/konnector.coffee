BaseView = require '../lib/base_view'
request = require '../lib/request'


# View used to display the configuration widget for a given konnector.
# Imports can be runned from there.
module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click #import-button": "onImportClicked"
        "click #delete-button": "onDeleteClicked"


    initialize: (options) ->
        super options
        @paths = options.paths or []
        @listenTo @model, 'change', @render


    # Build fields
    afterRender: =>
        slug = @model.get 'slug'
        values = @model.get 'fieldValues' or {}

        @$el.addClass "konnector-#{slug}"
        @updateImportWidget()

        if not @model.get('errorMessage')? or @model.get 'isImporting'
            @hideErrors()

        for name, val of @model.get 'fields'
            values ?= {}
            values[name] ?= ""

            @addFieldWidget slug, name, val, values

            # If the widget added is a folder selector, we add a change
            # listener that will change the open folder button link every time
            # the selector is changed.
            @configureFolderInput slug, name if val is 'folder'

        @addIntervalWidget slug


    # Show import status and enable/disable the import button depending on this
    # state.
    updateImportWidget: ->

        isImporting = @model.get 'isImporting'
        lastImport = @model.get 'lastImport'

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


    # Enable Import button.
    enableImportButton: ->
        @$('#import-button').attr 'aria-busy', false
        @$('#import-button').attr 'aria-disabled', false


    # Diable Import button.
    disableImportButton: ->
        @$('#import-button').attr 'aria-busy', true
        @$('#import-button').attr 'aria-disabled', true


    # Show error widget and fill it with given message.
    showErrors: (msg) ->
        @$('.error .message').html msg
        @$('.error').show()


    # Hide error widget.
    hideErrors: ->
        @$('.error').hide()


    # Grab data from field. Make data compatible with expected konnector input.
    # Then ask to the backend to run the import.
    onImportClicked: ->

        # Don't restart the import if an import is running.
        unless @model.get('isImporting')
            slug = @model.get 'slug'
            importDate = $("##{slug}-import-date").val()

            @hideErrors()

            fieldValues =
                date: importDate

            for name, val of @model.get 'fields'

                # For folder fields, it requires to convert the value (a folder
                # id) to a folder path.
                if val is 'folder'
                    fieldValues[name] = @getFolderPath slug, name

                # For simple fields, just get the value of the field.
                else
                    fieldValues[name] = $("##{slug}-#{name}-input").val()

            # Auto import interval and start date work separately from field
            # values
            importInterval = $("##{slug}-autoimport-input").val()

            # Disable the button when it's being clicked, realtime changes will
            # re-enable it when necessary.
            @disableImportButton()

            # Save field values and start importing data.
            data = {fieldValues, importInterval}
            @model.save data,
                success: (model, success) ->
                    # Success is handled via the realtime engine.
                error: (model, err) =>
                    # cozycloud.cc timeout is not considered like an error
                    if err.status >= 400 and err.status isnt 504
                        try
                            @showErrors t JSON.parse(err.responseText).message
                        catch
                            @showErrors t "import server error"


        else
            alert t 'import already running'


    # Get folder id from the current value of given folder field. Then convert
    # it to the folder path. Finally it returns the converted value.
    getFolderPath: (slug, name) ->
        id = $("##{slug}-#{name}-input").val()
        value = ''
        path = _.findWhere(@paths, id: id)
        value = path.path if path?
        return value


    # Add a change listener to update the "open folder" link each time
    # the selected folder changes.
    configureFolderInput: (slug, name) ->
        input = @$("##{slug}-#{name}-input")
        input.change ->
            id = input.val()
            folderButton = input.parent().parent().find(".folder-link")
            link = "/#apps/files/folders/#{id}"
            folderButton.attr 'href', link


    addFieldWidget: (slug, name, val, values) ->
        fieldHtml = """
<div class="field line">
<div><label for="#{slug}-#{name}-input">#{t(name)}</label></div>
"""

        if val is 'folder'

            # Add a widget to select given folder.
            fieldHtml += """
<div><select id="#{slug}-#{name}-input" class="folder"">
"""
            selectedPath = path: '', id: ''
            pathName = values[name] or @paths[0].path

            # Add an option for every folder. Value is id of the folder.
            # Displayed label is the path of the folder.
            for path in @paths
                if path.path is pathName
                    fieldHtml += """
<option selected value="#{path.id}">#{path.path}</option>
"""
                    selectedPath = path
                else
                    fieldHtml += """
<option value="#{path.id}">#{path.path}</option>
"""
            fieldHtml += "</select></div>"

            # Add a button to open quickly the selected folder in the files
            # app.
            fieldHtml += """
<a href="/#apps/files/folders/#{selectedPath.id}"
class="folder-link"
target="_blank">
open selected folder
</a>
"""
            fieldHtml += "</div>"

        else
            fieldHtml += """
<div><input id="#{slug}-#{name}-input" type="#{val}"
        value="#{values[name]}"/></div>
</div>
"""

        @$('.fields').append fieldHtml


    addIntervalWidget: (slug) ->
        lastAutoImport = @model.get 'lastAutoImport'

        intervals =
            none: t "none"
            hour: t "every hour"
            day: t "every day"
            week: t "every week"
            month: t "each month"

        importInterval = @model.get 'importInterval' or ''

        fieldHtml = """
<div class="field line">
<div><label for="#{slug}-autoimport-input">#{t 'auto import'}</label></div>
<div><select id="#{slug}-autoimport-input" class="autoimport">
"""
        for key, value of intervals
            selected = if importInterval is key then 'selected' else ''
            fieldHtml += """
<option value=\"#{key}\" #{selected}>#{value}</option>
"""

        fieldHtml += """
</select>
<span id="#{slug}-first-import">
<span id="#{slug}-first-import-text">
<a id="#{slug}-first-import-link" href="#">Select a starting date</a></span>
<span id="#{slug}-first-import-date"><span>From</span>
<input id="#{slug}-import-date" class="autoimport" maxlength="8" type="text">
</input>
</span></span>
</div>
</div>
"""
        @$('.fields').append fieldHtml

        @autoImportInput = @$("##{slug}-autoimport-input")
        @firstImport = @$("##{slug}-first-import")
        @firstImportDate = @$("##{slug}-first-import-date")
        @importDate = @$("##{slug}-import-date")
        @firstImportText = @$("##{slug}-first-import-text")
        @firstImportLink = @$("##{slug}-first-import-link")
        importInterval = @autoImportInput.val()

        @firstImportDate.hide()
        @importDate.datepicker
            minDate: 1
            dateFormat: "dd-mm-yy"

        # if auto-importation is set to day, week, or month
        if not (importInterval in ['none', 'hour'])

            # Only show the date if the first import didn't happened yet.
            isLater = moment(lastAutoImport).valueOf() > moment().valueOf()
            if lastAutoImport? and isLater
                val = moment(lastAutoImport).format 'DD-MM-YYYY'

                @firstImportDate.show()
                @firstImportText.hide()
                @importDate.val val
            else
                @firstImport.show()
        else
            @firstImport.hide()

        @firstImportLink.click (event) =>
            event.preventDefault()
            @firstImportDate.show()
            @firstImportText.hide()

        @autoImportInput.change =>
            importInterval = @autoImportInput.val()
            if not (importInterval in ['none', 'hour'])
                @firstImport.show()
            else
                @firstImport.hide()


    onDeleteClicked: ->
        request.del "konnectors/#{@model.id}", (err) =>
            if err
                alert t 'konnector deletion error'
            else
                alert t 'konnector deleted'
                @model.set 'lastAutoImport', null
                @model.set 'fieldValues', {}
                @model.set 'password', '{}'
                window.router.navigate '', trigger: true

