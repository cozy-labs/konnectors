Konnector = require '../models/konnector'
CozyInstance = require '../models/cozy_instance'


module.exports.main = (req, res) ->
    console.log 'main'
    async.parallel [
        (cb) -> Konnector.request 'all', cb
        Config.getInstance
        CozyInstance.first
    ], (err, results) ->
        [konnectors, config, instance] = results
    locale = instance?.locale or 'en'
    res.render 'index.jade', imports: """
        window.config = #{JSON.stringify(config)};
        window.locale = "#{locale}";
        window.initkonnectors = #{JSON.stringify(konnectors)};
    """
