path = require 'path'
americano = require 'americano'

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

        set:
            views: path.resolve __dirname, '../client'

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
