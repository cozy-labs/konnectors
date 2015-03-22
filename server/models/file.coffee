fs = require 'fs'
americano = require 'americano-cozy'
request = require 'request'
moment = require 'moment'
log = require('printit')
    prefix: 'file'

# Required to save file fetched via a konnector.
module.exports = File = americano.getModel 'File',
    path: String
    name: String
    creationDate: String
    lastModification: String
    class: String
    size: Number
    binary: Object
    modificationHistory: Object
    clearance: (x) -> x
    tags: (x) -> x

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
            log.error err if err
            callback null, newFile

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

    stream = request options, (err, res) ->
        if res.statusCode is 200
            # Once done create file metadata then attach binary to file.
            stats = fs.statSync filePath
            data.size = stats["size"]
            File.create data, (err, newFile) =>
                if err
                    log.error err
                    callback err
                else
                    attachBinary newFile

    stream.pipe fs.createWriteStream filePath
