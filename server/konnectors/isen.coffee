americano = require 'americano-cozy'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
async = require 'async'
fs = require 'fs'

log = require('printit')
    prefix: "Isen"
    date: true


# Models

Isen = americano.getModel 'Isen',
    date: Date
    fileId: String

Isen.all = (callback) ->
    PhoneBill.request 'byDate', callback

File = americano.getModel 'File',
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

# Konnector

module.exports =

    name: "Isen"
    slug: "isen"
    description: "Import data from ISEN."
    vendorLink: "https://www.isen.fr/"

    fields:
        firstname: "text",
        lastname: "text",
        folderPath: "folder"
    models:
        isen: Isen

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        Isen.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetchIcs requiredFields, (err) ->
            if err
                log.error
            callback()


fetchIcs = (requiredFields, callback) ->

    baseUrl = 'https://web.isen-bretagne.fr/cc/PublishVCalendar'
    firstname = requiredFields.firstname
    lastname = requiredFields.lastname
    options =
        method: 'GET'
        jar: true

    if firstname isnt '' and lastname isnt ''
        fetchUrl = "#{baseUrl}/#{firstname}.#{lastname}.ics"
        options.uri = fetchUrl
        request options, (err, res, body) ->

            console.log fetchUrl
            if err?
                log.error "No files retrieved"
                callback()
            else if res.statusCode is 404
                log.error "Error: user not found or not allowed"
                callback()
            else
                icsData = parseIcs body
                if icsData.length is 0
                    log.error 'No urls found in ics file'
                    callback()
                else
                    processUrls requiredFields, icsData, callback

    else
        log.error 'Firstname and/or Lastname not supplied'
        callback()

parseIcs = (data) ->
    icsData = data.split('\n')
    name = 'DESCRIPTION'
    match = 'https://web.isen-bretagne.fr/cc/jsonFileList/'
    urls = []
    for value in icsData
        if value.substring(0,name.length) is name
            valueArray = value.split('\\n')
            allegedUrl = valueArray[valueArray.length-2]
            if allegedUrl.substring(0, match.length) is match
                if allegedUrl not in urls
                    urls.push allegedUrl
    return urls

processUrls = (requiredFields, list, callback) ->
    async.eachSeries list, (url, cb) ->
        fetchJson requiredFields, url, cb
    , (err) ->
        callback()

fetchJson = (requiredFields, url, callback) ->
    options =
        method: 'GET'
    options.uri = url
    request options, (err, res, body) ->
        try
            data = JSON.parse body

        catch error
            log.error "Retrieving file : JSON.parse error : #{error}"
            callback()

        parseJson data, callback

parseJson = (data, callback) ->

    name = 'File(s)'
    if data[name]? and data['course']?
        async.eachSeries data[name], (object, cb) ->
            parseFile object, data['course'], (err) ->
                if err
                    log.error err
                    cb()
                else
                    log.info "#{object['fileName']} imported"
                    cb()
        , (err) ->
            log.info 'Import of file finished'
            callback()
    else
        console.log 'Error : Missing data in the file'
        callback()

parseFile = (object, path, callback) ->
    if object['dateLastModified']? and object['fileName']? and object['url']?
        createFile object['fileName'], object['url'], object['dateLastModified'], path, (err) ->
            if err
                log.error err
                callback()
            else
                callback()
    else
        log.error 'error: Missing keys'
        callback()

createFile = (fileName, url, date, path, callback) ->

    now = moment().toISOString()
    filePath = "/tmp/#{fileName}"

    data =
        name: fileName
        path: path
        creationDate: now
        lastModification: moment(date,'YYYY-MM-DD hh:mm:ss').toISOString()
        tags: [""]
        class: 'document'
    #console.log data

    # Index file to DS indexer.
    index = (newFile) ->
        newFile.index ["name"], (err) ->
            log.error err if err
            callback()

    # Attach binary to newly created file.
    attachBinary = (newFile) ->
        newFile.attachBinary filePath, "name": "file", (err) ->
            if err
                log.error err
                callback err
            else
                index newFile

    # Save file in a tmp folder while attachBinary supports stream.
    options =
        uri: url
        method: 'GET'
        jar: true
    stream = request options, (err) ->
        if err
            log.error err
            callback err
        else
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
