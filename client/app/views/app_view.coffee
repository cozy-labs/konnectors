BaseView = require '../lib/base_view'
Konnectors = require './konnectors'

module.exports = class AppView extends BaseView

    el: 'body.application'
    template: require('./templates/home')

    afterRender: ->
        konnectors = new Konnectors()
        konnectors.fetch()
