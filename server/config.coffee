americano = require 'americano'
initKonnectors = require './init/konnectors'

config =
    common:
        use: [
            americano.bodyParser()
            americano.methodOverride()
            americano.errorHandler
                dumpExceptions: true
                showStack: true
            americano.static __dirname + '/../client/public',
        ]
        afterStart: initKonnectors

    development: [
        americano.logger 'dev'
    ]

    production: [
        americano.logger 'short'
    ]

    plugins: [
        'americano-cozy'
    ]

module.exports = config
