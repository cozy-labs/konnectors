exports.config =

    files:
        javascripts:
            joinTo:
                'javascripts/app.js': /^app/
                'javascripts/vendor.js': /^vendor/
            order:
                before: [
                    'vendor/scripts/jquery-1.9.1.js'
                    'vendor/scripts/underscore-1.4.4.js'
                    'vendor/scripts/backbone-1.0.0.js'
                ]

        stylesheets:
            joinTo: 'stylesheets/app.css'
            order:
                before: ['vendor/styles/normalize.css']
                after: ['vendor/styles/helpers.css']

        templates:
            defaultExtension: 'jade'
            joinTo: 'javascripts/app.js'

