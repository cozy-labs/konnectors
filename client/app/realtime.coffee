Konnector = require '../models/konnector'

module.exports = class KonnectorListener extends CozySocketListener

    models:
        konnector: Konnector

    events: [
        'konnector.update'
    ]

    onRemoteUpdate: (model) ->
        isImporting = model.get 'isImporting'
        slug = model.get 'slug'
        lastImport = model.get 'lastImport'

        formattedDate = moment(lastImport).format t('date format')
        if isImporting
            $(".konnector-#{slug} .last-import").html t('importing...')
        else if lastImport?
            $(".konnector-#{slug} .last-import").html formattedDate
        else
            $(".konnector-#{slug} .last-import").html t('no import performed')
