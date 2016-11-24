async = require 'async'
User = require '../models/user'
Konnector = require '../models/konnector'
Folder = require '../models/folder'
CozyInstance = require '../models/cozy_instance'


# Returns the html page required to load the javascript code of the single page
# app.
# Adds data required by the first rendering: konnector infos, available folders
# and instance parameters.
module.exports.main = (req, res) ->

    async.series
        konnectors: Konnector.getKonnectorsToDisplay
        instance: CozyInstance.first
        folders: Folder.all
        user: User.first

    , (err, results) ->
        console.log err if err?

        {konnectors, instance, folders} = results

        res.render 'index',
            locale: instance?.locale or 'en'
            imports:
                konnectors: konnectors
                folders: folders
                # Should be override to load a specific context in client app.
                # Defaults to `cozy`
                context: 'cozy'
