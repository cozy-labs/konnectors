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


Folder.isPresent = (fullPath, callback) ->
    Folder.request "byFullPath", key: fullPath, (err, folders) ->
        return callback err if err
        callback null, folders?.length > 0


Folder.createNewFolder = (folder, callback) ->
    Folder.create folder, (err, newFolder) ->
        return callback err if err
        callback null, newFolder


Folder.mkdir = (path, callback) ->
    return callback(null, {path}) if path.length is 0

    Folder.isPresent path, (err, isPresent) ->
        parts = path.split '/'
        name  = parts.pop()
        path  = parts.join '/'

        if isPresent
            callback null, {name, path}
        else
            Folder.createNewFolder {name, path}, callback


Folder.mkdirp = (path, callback) ->
    recurseCreate = (err, folder) ->
        # Remove the initial `/` to prevent empty folder creation
        if folder.path.substring(1).split('/').length > 1
            Folder.mkdir folder.path, recurseCreate
        else
            Folder.mkdir folder.path, callback

    Folder.mkdir path, recurseCreate
