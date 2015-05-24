# This model is required by realtime engine to listen to folder changes.
module.exports = class FolderModel extends Backbone.Model

    rootUrl: 'folders/'
    url: ->
        "folders/#{@get 'id'}"


    getFullPath: ->
        "#{@get 'path'}/#{@get 'name'}"

