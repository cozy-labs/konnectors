fs = require 'fs'
americano = require 'cozydb'
request = require 'request'
moment = require 'moment'
mimetype = require 'mimetype'
Binary = require './binary'
log = require('printit')
    prefix: 'konnectors'


# Required to save file fetched via a konnector.
module.exports = File = americano.getModel 'File',
    path: String
    name: String
    creationDate: String
    lastModification: String
    class: String
    mime: String
    size: Number
    binary: Object
    modificationHistory: Object
    clearance: [Object]
    tags: [String]


File.all = (params, callback) ->
    File.request "all", params, callback

File.byFolder = (params, callback) ->
    File.request "byFolder", params, callback

File.byFullPath = (params, callback) ->
    File.request "byFullPath", params, callback


# Tells if a file is already stored in the Cozy at the given path.
File.isPresent = (fullPath, callback) ->
    File.request "byFullPath", key: fullPath, (err, files) ->
        return callback err if err
        callback null, files? and files.length > 0


# Create a new File object that will be displayed inside the file application.
# The binary attached to the file is downloaded from a given url.
# Given tags are associated with the newly created file.
File.createNew = (fileName, path, url, tags, callback) ->
    now = moment().toISOString()
    filePath = "/tmp/#{fileName}"
    mime = mimetype.lookup(fileName) || 'application/pdf'

    # Returns a file calss depending of the mime type. It's useful to render
    # icons properly.
    getFileClass = (type) ->
        switch type.split('/')[0]
            when 'image' then fileClass = "image"
            when 'application' then fileClass = "document"
            when 'text' then fileClass = "document"
            when 'audio' then fileClass = "music"
            when 'video' then fileClass = "video"
            else
                fileClass = "file"
        fileClass

    data =
        name: fileName
        path: path
        creationDate: now
        lastModification: now
        tags: tags
        class: getFileClass mime
        mime: mime

    # Attach binary to newly created file.
    attachBinary = (newFile) ->
        newFile.attachBinary filePath, "name": "file", (err) ->
            if err
                log.error err
                callback err
            else
                fs.unlink filePath, ->
                    File.find newFile.id, (err, file) ->
                        callback err, file

    # Save file in a tmp folder while attachBinary supports stream.
    options =
        uri: url
        method: 'GET'
        jar: true

    log.info "Downloading file at #{url}..."
    stream = request options, (err, res, body) ->
        if res?.statusCode is 200
            # Once done create file metadata then attach binary to file.
            try
                stats = fs.statSync filePath
                data.size = stats["size"]
                log.info "File at #{url} downloaded."
                File.create data, (err, newFile) ->
                    if err
                        log.error err
                        callback err
                    else
                        attachBinary newFile
            catch err
                callback err
        else
            if res?
                log.error res.statusCode, res.body
            callback new Error 'Cannot download file, wrong url'

    stream.pipe fs.createWriteStream filePath


File::destroyWithBinary = (callback) ->
    if @binary?
        binary = new Binary @binary.file
        binary.destroy (err) =>
            if err
                log.error "Cannot destroy binary linked to document #{@id}"
            @destroy callback
    else
        @destroy callback
