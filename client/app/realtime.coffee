Konnector = require '../models/konnector'
Folder = require '../models/folder'


# Listen to two kinds of update:
# * Konnector changes to update the konnector status when an import is
#   finished.
# * Folder changes to update the folder list when a change occurs on a folder.
module.exports = class KonnectorListener extends CozySocketListener

    models:
        konnector: Konnector
        folder: Folder

    events: [
        'konnector.update'
        'folder.create'
        'folder.update'
        'folder.delete'
    ]


    # Update currently displayed konnector status if the change is related to
    # a konnector.
    # When it's about a folder, it pushes a folder:change event to the event
    # bus.
    onRemoteUpdate: (model) ->

        if model?.get('docType')?.toLowerCase() is 'konnector'
            isImporting = model.get 'isImporting'
            slug = model.get 'slug'
            lastImport = model.get 'lastImport'
            errorMessage = model.get 'importErrorMessage'

            formattedDate = moment(lastImport).format t('date format')
            lastImportField = $(".konnector-#{slug} .last-import")
            if isImporting
                lastImportField.html t('importing...')
            else if lastImport?
                lastImportField.html formattedDate
            else
                lastImportField.html t('no import performed')

            if errorMessage?
                Backbone.Mediator.pub 'konnector:error', model

        else
            Backbone.Mediator.pub 'folders:update', new Folder model.attributes


    # Only folder creation fires remote create event. So, it sends a folders
    # change event.
    onRemoteCreate: (model) ->
        Backbone.Mediator.pub 'folders:create', model


    # Only folder creation fires remote deletion event. So, it sends a folders
    # change event.
    onRemoteDelete: (model) ->
        Backbone.Mediator.pub 'folders:delete', model

