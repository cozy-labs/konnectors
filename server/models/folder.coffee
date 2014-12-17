americano = require 'americano-cozy'

module.exports = Folder = americano.getModel 'Folder',
    path: String
    name: String

Folder::getFullPath = ->
    "#{@path}/#{@name}"

Folder.allPath = (callback) ->
    Folder.request "byFullPath", (err, folders) ->
        return callback err if err
        paths = []
        paths.push folder.getFullPath() for folder in folders
        return callback null, paths

Folder.createNewFolder = (folder, callback) ->
        Folder.create folder, (err, newFolder) ->
            if err then callback err
            else
                newFolder.index ["name"], (err) ->
                console.log err if err
                callback null, newFolder
