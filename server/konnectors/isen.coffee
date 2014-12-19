americano = require 'americano-cozy'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
async = require 'async'
fs = require 'fs'
Folder = require '../models/folder'
File = require '../models/file'

log = require('printit')
    prefix: "Isen"
    date: true

# Models

Isen = americano.getModel 'Isen',
    date: Date
    fileId: String

Isen.all = (callback) ->
    Isen.request 'byDate', callback

module.exports =

    name: "Isen"
    slug: "isen"
    description: "Import data from ISEN."
    vendorLink: "https://www.isen.fr/"

    fields:
        firstname: "text",
        lastname: "text"
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
            else
                log.info "Import finished"
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
        log.debug "Fetching #{fetchUrl}"
        options.uri = fetchUrl
        request options, (err, res, body) ->

            if err?
                log.error err
                log.error "No files retrieved"
                callback()
            else if res.statusCode is 404
                log.error "Error: user not found or not allowed"
                callback()
            else
                data = parseIcs body

                if data.length is 0
                    log.error 'No urls found in ics file'
                    callback()
                else
                    processUrls requiredFields, data, callback

    else
        log.error 'Firstname and/or Lastname not supplied'
        callback()

parseIcs = (data) ->

    log.debug 'Parsing file...'
    icsData = data.split('\n')
    matchString = 'DESCRIPTION'
    baseUrl = 'https://web.isen-bretagne.fr/cc/jsonFileList/'
    urls = []

    # find all urls in the file matching with baseUrl
    for value in icsData
        if value.substring(0, matchString.length) is matchString
            valueArray = value.split('\\n')
            allegedUrl = valueArray[valueArray.length - 2]
            if allegedUrl.substring(0, baseUrl.length) is baseUrl
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

    log.info "Retrieving file : #{url}"
    request options, (err, res, body) ->

        if err
            log.error err
            callback()
        else if body is ""
            log.info 'File empty, the course may be not availiable ' +
            'for the moment'
            callback()
        else
            #try to Json.parse the data
            try
                data = JSON.parse body

            catch error
                log.error "JSON.parse error : #{error}"
                callback error

            if data?
                checkKeys data, callback

checkKeys = (data, callback) ->
    if data['File(s)']? and data['course']? and data['year']? \
    and data['curriculum']?
        processFolder data, callback
    else
        log.error 'Error : Missing data in the file'
        callback()

processFolder = (data, callback) ->

    # Check if folder arboresecense is present, otherwise create it
    # Structure is year/ curriculum / course
    year = data['year']
    curriculum = data['curriculum']
    course = data['course']
    checkAndCreateFolder year, '', (err) ->
        if err
            log.error "error: #{err}"
            callback()
        else
            checkAndCreateFolder curriculum, '/' + year, (err) ->
                if err
                    log.error "error: #{err}"
                    callback()
                else
                    checkAndCreateFolder course, '/' + year + '/' + curriculum, (err) ->
                        if err
                            log.error "error: #{err}"
                            callback()
                        else
                            parseJson data, callback

checkAndCreateFolder = (name, path, callback) ->

    Folder.allPath (err, folders) ->

        fullpath = path + '/' + name

        # if the folder exists
        if fullpath in folders
            callback null
        # Otherwise create it
        else
            now = moment().toISOString()
            document =
                name: name
                path: path
                creationDate: now
                lastModification: now
                class: 'document'

            Folder.createNewFolder document, (err, newFolder) ->
                if err
                    callback err
                else
                    log.info "folder #{name} created"
                    callback null

parseJson = (data, callback) ->

    async.eachSeries data['File(s)'], (object, cb) ->
        parseFile object, data, (err) ->
            if err
                log.error err
                cb()
            else
                cb()
    , (err) ->
        log.info 'Import of file finished'
        callback()


parseFile = (object, data, callback) ->

    # if all the required values are present
    if object['dateLastModified']? and object['fileName']? and object['url']?

        name = object['fileName']
        path = '/' + data['year'] + '/' + data['curriculum'] + '/' + data['course']
        fullPath = "#{path}/#{name}"
        date = moment(object['dateLastModified'],'YYYY-MM-DD hh:mm:ss').toISOString()
        url = object['url']

        checkFile name, path, fullPath, date, url, callback
    else
        log.error 'error: Missing keys'
        callback()

checkFile = (name, path, fullPath, date, url, callback) ->

    File.byFullPath key: fullPath, (err, sameFiles) ->
        return callback err if err
        # there is already a file with the same name
        if sameFiles.length > 0

            file = sameFiles[0]
            # if the new file is newer
            if file.lastModification < date
                # destroy it
                file.destroyWithBinary (err) ->
                    if err
                        log.error "Cannot destroy #{name}"
                        callback()
                    else
                        log.debug "#{name} deleted"
                        File.createNew name, path, date, url, [], (err) ->
                            if err
                                log.error err
                                callback()
                            else
                                log.info "#{name} imported"
                                callback()
            else
                log.debug "skipping #{name}"
                callback()
        else
            File.createNew name, path, date, url, [], (err) ->
                if err
                    log.error err
                    callback()
                else
                    log.info "#{name} imported"
                    callback()
