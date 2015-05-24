async = require 'async'
Konnector = require '../models/konnector'
Folder = require '../models/folder'
CozyInstance = require '../models/cozy_instance'


module.exports.main = (req, res) ->

    async.series
        konnectors: Konnector.getKonnectorsToDisplay
        instance: CozyInstance.first
        folders: Folder.all
    , (err, results) ->
        console.log err if err?

        {konnectors, instance, folders} = results
        locale = instance?.locale or 'en'

        res.render 'index.jade', imports: """
            window.locale = "#{locale}";
            window.initKonnectors = #{JSON.stringify konnectors};
            window.initFolders = #{JSON.stringify folders};
        """
