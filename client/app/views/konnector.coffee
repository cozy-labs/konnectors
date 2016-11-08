BaseView = require '../lib/base_view'
request = require '../lib/request'


# View used to display the configuration widget for a given konnector.
# Imports can be runned from there.
module.exports = class KonnectorView extends BaseView
    template: require './templates/konnector'
    className: 'konnector'

    events:
        "click #import-button": "onImportClicked"
        "click #add-button": "onAddClicked"
        "click #remove-button": "onRemoveClicked"
        "click #delete-button": "onDeleteClicked"

    subscriptions:
        "konnector:error": "onImportError"


    initialize: (options) ->
        super options
        @paths = options.paths or [ path: '/', id: '']
        @listenTo @model, 'change', @render

    # Build fields
    afterRender: =>
        slug = @model.get 'slug'

        if not @values? or @values.length is @model.get('accounts').length
            @values = @model.get('accounts') or [{}]

        errorMessage = @model.get 'importErrorMessage'

        @$el.addClass "konnector-#{slug}"
        @updateImportWidget()

        if not errorMessage? or @model.get 'isImporting'
            @hideErrors()

        else if errorMessage
            @showErrors t errorMessage

        @values.push {} if @values.length is 0

        # Create an account line for each set of values.
        end = @values.length - 1
        for i, values of @values
            @renderValues values, slug, i
            if i isnt end
                @$('.fields').append '<div class="separator"/>&nbsp;</div>'

        @addIntervalWidget slug


    renderValues: (values, slug, index) =>
        if @model.has 'connectUrl'
            @addConnectButton index

        for name, val of @model.get 'fields'
            values[name] ?= ""

            @addFieldWidget slug, name, val, values, index

            # If the widget added is a folder selector, we add a change
            # listener that will change the open folder button link every time
            # the selector is changed.
            @configureFolderInput slug, name, index if val is 'folder'


    # Show import status and enable/disable the import button depending on this
    # state.
    updateImportWidget: ->

        isImporting = @model.get 'isImporting'
        lastImport = @model.get 'lastImport'

        @$('.last-import').html t('importing...')
        if isImporting
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
        @$('#import-button').attr('aria-busy', false)
                            .attr('aria-disabled', false)
                            .attr('disabled', false)


    # Diable Import button.
    disableImportButton: ->
        @$('#import-button').attr('aria-busy', true)
                            .attr('aria-disabled', true)
                            .attr('disabled', true)


    # Show error widget and fill it with given message.
    showErrors: (msg) ->
        msg = msg.replace /<[^>]*>/ig, ''
        @$('.error .message').html msg
        @$('.error').show()


    # Hide error widget.
    hideErrors: ->
        @$('.error').hide()


    # When add button is clicked, it grabs account values currently set in
    # fields. Then, it adds an empty account to this list. The empty account
    # will lead the rendering operation to a new set of fields. Such, the user
    # will be able to configure a new account.
    onAddClicked: ->
        values = []
        for i in [0..(@values.length - 1)]
            values.push @getFieldValues i
        values.push {}

        @values = values
        @render()
        @$('#add-button').hide() if @values.length > 4


    # When remove button is clicked, it grabs account values currently set in
    # fields. Then, it removes last account from this list. It will lead
    # the rendering to remove the fields for the last account.
    onRemoveClicked: ->
        values = []
        for i in [0..(@values.length - 1)]
            values.push @getFieldValues i
        values.pop()
        @values = values

        @render()
        @$('#add-button').hide() if @values.length > 4



    # Get values for account located at given index.
    getFieldValues: (index) ->
        slug = @model.get 'slug'
        fieldValues = {}

        for name, val of @model.get 'fields'

            id = "##{slug}-#{name}#{index}-input"
            # For folder fields, it requires to convert the value (a folder
            # id) to a folder path.
            if val is 'folder'
                fieldValues[name] = @getFolderPath slug, name, index
            else if val is 'link'
                fieldValues[name] = $(id).attr 'href'
            else if val is 'label'
                fieldValues[name] = $(id).text()
            # For simple fields, just get the value of the field.
            else
                fieldValues[name] = $(id).val()
        fieldValues


    # Grab data from field. Make data compatible with expected konnector input.
    # Then ask to the backend to run the import.
    onImportClicked: ->

        # Don't restart the import if an import is running.
        unless @model.get 'isImporting'
            slug = @model.get 'slug'
            date = $("##{slug}-import-date").val()

            @hideErrors()
            accounts = []
            for i, values of @values
                accounts.push @getFieldValues i
            @values = accounts

            # Auto import interval and start date work separately from field
            # values
            importInterval = $("##{slug}-autoimport-input").val()

            # Disable the button when it's being clicked, realtime changes will
            # re-enable it when necessary.
            @disableImportButton()

            # Save field values and start importing data.
            data = {accounts, importInterval, date}
            @model.set 'isImporting': true

            @model.save data,
                success: (model, success) ->
                    # Success is handled via the realtime engine.
                error: (model, err) =>
                    if err.status >= 400 and err.status isnt 504
                        try
                            @showErrors t JSON.parse(err.responseText).message
                        # cozycloud.cc timeout is not considered like an error
                        catch error
                            @showErrors t "import server error"


        else
            alert t 'import already running'


    # Get folder id from the current value of given folder field. Then convert
    # it to the folder path. Finally it returns the converted value.
    getFolderPath: (slug, name, index) ->
        id = $("##{slug}-#{name}#{index}-input").val()
        value = ''
        path = _.findWhere(@paths, id: id)
        value = path.path if path?
        return value


    # Add a change listener to update the "open folder" link each time
    # the selected folder changes.
    configureFolderInput: (slug, name, index) ->
        input = @$("##{slug}-#{name}#{index}-input")
        input.change ->
            id = input.val()
            folderButton = input.parent().parent().find(".folder-link")
            link = "/#apps/files/folders/#{id}"
            folderButton.attr 'href', link


    addFieldWidget: (slug, name, val, values, index) ->
        if val is 'label'
            fieldHtml = """
<div class="field line #{'hidden' if val is 'hidden'}">
    <label for="#{slug}-#{name}#{index}-input">#{t(name)} : </label>
    <b id="#{slug}-#{name}#{index}-input" >#{values[name]}</b>
</div>
"""
        else if val is 'link'
            fieldHtml = """
<div class="field line #{'hidden' if val is 'hidden'}">
    <label for="#{slug}-#{name}#{index}-input">#{t(name)} : </label>
    <a target="_blank" href="#{values[name]}"
       id="#{slug}-#{name}#{index}-input">
        #{values[name]}
    </a>
</div>
"""
        else
            fieldHtml = """
<div class="field line #{'hidden' if val is 'hidden'}">
<div><label for="#{slug}-#{name}#{index}-input">#{t(name)}</label></div>
"""

            if val is 'folder'

                # Add a widget to select given folder.
                fieldHtml += """
<div><select id="#{slug}-#{name}#{index}-input" class="folder"">
    <option selected value="/">/</option>
"""
                selectedPath = path: '', id: ''
                pathName = values[name]
                pathName ?= @paths[0].path if @paths.length > 0

                if @paths.length > 0
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
                # If no path is already set, the link should point to the root
                # uri of the files app
                folderPath = if selectedPath.id then \
                "/#apps/files/folders/#{selectedPath.id}" else "/#apps/files/"
                fieldHtml += """
<a href="#{folderPath}"
class="folder-link"
target="_blank">
#{t "open selected folder"}
</a>
"""
                fieldHtml += "</div>"

            else
                fieldHtml += """
<div><input id="#{slug}-#{name}#{index}-input" type="#{val}"

        value="#{values[name]}" #{'readonly' if val is 'readonly'} /></div>
</div>
"""

        @$('.fields').append fieldHtml


    addConnectButton: (index) ->
        connectUrl = @model.get 'connectUrl'
        if connectUrl.indexOf 'redirect_url' isnt -1
            redirectUrl = "#{document.location.origin}\
                /#{@model.url()}/#{index}/redirect"
            redirectUrl = encodeURIComponent redirectUrl
            connectUrl += redirectUrl

        connectButtonHtml = """
<div class='connectButton'>
<a href='#{connectUrl}' ><button>#{t 'Connect'}</button></a>
</div>"""
        connectButtonElem = $ connectButtonHtml
        @$('.fields').append connectButtonElem


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
<div><select id="#{slug}-autoimport-input" class="autoimport">
"""
        for key, value of intervals
            selected = if importInterval is key then 'selected' else ''
            fieldHtml += """
<option value=\"#{key}\" #{selected}>#{value}</option>
"""

        fieldHtml += """
</select>
</div>
</div>
"""
        @$('.config').append fieldHtml

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

        if @model.has 'customView'
            # Apply translation on customView
            rawCustomView = @model.get 'customView'
            translatedCustomView = rawCustomView.replace /<%t ([^%]*)%>/g
            , (match, key) -> return t key.trim()

            customViewElem = $ "<div class='customView'></div>"
            customViewElem.append translatedCustomView
            customViewElem.insertBefore @$('.fields')

        if @model.has 'vendorLink'
            link = @model.get 'vendorLink'
            link = "https://#{link}" if not link.match(/http[s]*:\/\//)
            vendorLinkHtml = """
<div class='vendorLink'>
    <span>#{t 'vendorLink'}</span>
    <a href="#{link}" target="_blank">#{link}</a>
</div>"""
            vendorLinkElem = $ vendorLinkHtml
            @$('.description').append vendorLinkElem


    onDeleteClicked: ->
        request.del "konnectors/#{@model.id}", (err) =>
            if err
                alert t 'konnector deletion error'
            else
                alert t 'konnector deleted'
                @model.set 'lastAutoImport', null
                @model.set 'accounts', [{}]
                @model.set 'password', '{}'
                @model.set 'importErrorMessage', null

                window.router.navigate '', trigger: true



    # This function is fired when a change of the model is fired on the backend
    # side and the model has an error field not empty.
    # Once executed this function displays the error
    onImportError: (model) ->
        errorMessage = model.get 'importErrorMessage'

        @model.set 'importErrorMessage', errorMessage
        @showErrors t errorMessage
