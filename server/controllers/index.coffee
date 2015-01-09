async = require 'async'
Konnector = require '../models/konnector'
CozyInstance = require '../models/cozy_instance'


module.exports.main = (req, res) ->

    async.parallel
        konnectors: Konnector.getKonnectorsToDisplay
        instance: CozyInstance.first
    , (err, results) ->
        console.log err if err?

        {konnectors, instance} = results
        locale = instance?.locale or 'en'

        res.render 'index.jade', imports: """
            window.locale = "#{locale}";
            window.initKonnectors = #{JSON.stringify konnectors};
        """
