americano = require 'cozydb'
async = require 'async'
log = require('printit')
    prefix: 'konnectors'

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


Folder.isPresent = ({name, path}, callback) ->
    Folder.request "byFullPath", key: "#{path}/#{name}", (err, folders) ->
        return callback err if err
        callback null, folders?.length > 0


Folder.createNewFolder = (folder, callback) ->
    Folder.create folder, (err, newFolder) ->
        return callback err if err
        path = if newFolder.path? then newFolder.path else '/'
        log.info "Folder #{path}/#{newFolder.name} successfully created."
        callback null, newFolder


Folder.mkdir = ({name, path}, callback) ->
    return callback(null, {path}) if name.length is 0

    Folder.isPresent {name, path}, (err, isPresent) ->
        if isPresent
            callback null, {name, path}
        else
            Folder.createNewFolder {name, path}, callback


Folder.mkdirp = (path, callback) ->
    cleanPath = if path.charAt(0) is '/' then path.substring(1) else path
    return callback new Error 'empty path' if cleanPath.length is 0

    folders = cleanPath.split '/'

    createFolder = (folder, callback) ->
        folderIndex = folders.indexOf folder
        Folder.mkdir \
            {name: folder,
            # [''].concat() adds en empty element to have a leading '/' in
            # the final string.
            path: [''].concat(folders.slice(0, folderIndex)).join('/')},
            callback

    async.eachSeries folders, createFolder, callback
