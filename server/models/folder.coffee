americano = require 'cozydb'


# Folder model is used to list the list of available folders in the user's
# Cozy. It's required for konnectors that download files like bill PDFs.
module.exports = Folder = americano.getModel 'Folder',
    path: String
    name: String


# Get full path for given folder.
Folder::getFullPath = ->
    "#{@path}/#{@name}"


# Return folder list ordered by full path.
Folder.all = (callback) ->
    Folder.request "byFullPath", (err, folders) ->
        return callback err if err
        callback null, folders


Folder.allPath = (callback) ->
    Folder.all (err, folders) ->
        return callback err if err
        folders = folders.map (folder) -> folder.getFullPath()
        callback err, folders


Folder.createNewFolder = (folder, callback) ->
    Folder.create folder, (err, newFolder) ->
        return callback err if err
        callback null, newFolder
