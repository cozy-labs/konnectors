fs = require 'fs'
americano = require 'cozydb'
request = require 'request'
moment = require 'moment'
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


# Create a new File object that will be displayed inside the file application.
# The binary attached to the file is downloaded from a given url.
# Given tags are associated with the newly created file.
File.createNew = (fileName, path, date, url, tags, callback) ->
    now = moment().toISOString()
    filePath = "/tmp/#{fileName}"

    data =
        name: fileName
        path: path
        creationDate: now
        lastModification: now
        tags: tags
        class: 'document'
        mime: 'application/pdf'

    # Index file to DS indexer.
    index = (newFile) ->
        newFile.index ["name"], (err) ->
            log.error err if err and Object.keys(err).length isnt 0
            File.find newFile.id, (err, file) ->
                callback err, file

    # Attach binary to newly created file.
    attachBinary = (newFile) ->
        newFile.attachBinary filePath, "name": "file", (err) ->
            if err
                log.error err
                callback err
            else
                fs.unlink filePath, ->
                    index newFile

    # Save file in a tmp folder while attachBinary supports stream.
    options =
        uri: url
        method: 'GET'
        jar: true

    stream = request options, (err, res, body) ->
        if res.statusCode is 200
            # Once done create file metadata then attach binary to file.
            stats = fs.statSync filePath
            data.size = stats["size"]
            File.create data, (err, newFile) ->
                if err
                    log.error err
                    callback err
                else
                    attachBinary newFile
        else
            log.error res.statusCode, res.body
            callback new Error 'Cannot download file, wrong url'

    stream.pipe fs.createWriteStream filePath

