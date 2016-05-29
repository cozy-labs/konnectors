konnectorHash = require '../lib/konnector_hash'
localization = require '../lib/localization_manager'
NotificationHelper = require 'cozy-notifications-helper'
notification = new NotificationHelper 'konnectors'
slugify = require 'cozy-slug'

log = require('printit')
    prefix: null
    date: true

# Create a notification telling how many data were imported.
module.exports = (konnector, notifContents) ->
    model = konnectorHash[konnector.slug]

    prefix = localization.t 'notification prefix', name: model.name

    for index of notifContents
        notificationSlug = konnector.slug

        # For each account of the konnector, generate a unique nofication slug
        # based on credentials
        for credential in konnector.accounts[index]
            notificationSlug += "_#{slugify credential}"

        notifContent = notifContents[index]
        # Only through the notification if the notification content
        # is defined. If no import was done, the notification content is
        # undefined
        if notifContent? \
        and  typeof(notifContent) is 'string'
            notification.createOrUpdatePersistent notificationSlug,
                app: 'konnectors'
                text: "#{prefix} #{notifContent}"
                resource:
                    app: 'konnectors'
                    url: "konnector/#{konnector.slug}"
            , (err) ->
                log.error err if err?

        else

        # For this account, if there was an error before, but that last
        # import was successful AND didn't not return a notification content,
        # the error notification is simply removed.
            notification.destroy notificationSlug, (err) ->
                log.error err if err?
