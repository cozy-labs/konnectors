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

        if isImporting
            $(".konnector-#{slug} .last-import").html 'importing...'
        else
            $(".konnector-#{slug} .last-import").html moment().format 'LLL'
