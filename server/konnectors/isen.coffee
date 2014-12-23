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
        @fetchIcs requiredFields, (err, body) =>
            if err?
                log.error err
                callback err
            else
                @parseIcs body, (err, list) =>
                    if err?
                        log.error err
                        callback err
                    else
                        @processUrls list, (err) =>
                            if err?
                                log.error err
                                callback err
                            else
                                log.info "Import finished"
                                callback()


    fetchIcs: (requiredFields, callback) ->

        baseMainUrl = 'https://web.isen-bretagne.fr/cc/PublishVCalendar'
        firstname = requiredFields.firstname
        lastname = requiredFields.lastname
        options =
            method: 'GET'
            jar: true

        if firstname isnt '' and lastname isnt ''

            fetchUrl = "#{baseMainUrl}/#{firstname}.#{lastname}.ics"
            log.debug "Fetching #{fetchUrl}"
            options.uri = fetchUrl
            request options, (err, res, body) =>

                if err?
                    log.error err
                    callback(err)
                else if res.statusCode is 404
                    err =  "Error: user not found or not allowed"
                    callback(err)
                else
                    callback null, body

        else
            err = 'Firstname and/or Lastname not supplied'
            callback(err)

    parseIcs: (mainData, callback) ->

        log.debug 'Parsing file...'
        icsData = mainData.split('\n')
        matchString = 'DESCRIPTION'
        baseUrl = 'https://web.isen-bretagne.fr/cc/jsonFileList/'
        list = []

        # find all urls in the file matching with baseUrl
        for value in icsData
            if value.substring(0, matchString.length) is matchString
                valueArray = value.split('\\n')
                allegedUrl = valueArray[valueArray.length - 2]
                if allegedUrl.substring(0, baseUrl.length) is baseUrl
                    if allegedUrl not in list
                        list.push allegedUrl

        if list.length is 0
            err =  'No urls found in ics file'
            callback(err)
        else
            callback null, list

    processUrls: (list, callback) ->

        # fetch Json data from every course
        async.eachSeries list, (url, cb) =>
            @fetchJson url, cb
        , (err) ->
            if err?
                callback(err)
            else
                callback null

    fetchJson: (url, callback) ->

        options =
            method: 'GET'
        options.uri = url

        log.info "Retrieving file : #{url}"
        request options, (err, res, body) =>

            if err?
                log.error err
                callback()
            else if body is ""
                log.info 'Course file empty, the course may be not availiable ' +
                'for the moment'
                callback()
            else
                #try to Json.parse the data
                try
                    courseData = JSON.parse body

                catch error
                    log.error "JSON.parse error : #{error}"
                    callback error

                if courseData?
                    @checkKeys courseData, callback

    checkKeys: (courseData, callback) ->

        # Check if all the values are present in the course file
        if courseData['File(s)']? and courseData['course']? and courseData['year']? \
        and courseData['curriculum']?
            @processFolder courseData, callback
        else
            log.error 'Error : Missing course data in the file'
            callback()

    processFolder: (courseData, callback) ->

        # Check if folder arboresecense is present, otherwise create it
        # Structure is year / curriculum / course
        year = courseData['year']
        curriculum = courseData['curriculum']
        course = courseData['course']
        @checkAndCreateFolder year, '', (err) =>
            if err?
                log.error "error: #{err}"
                callback()
            else
                @checkAndCreateFolder curriculum, '/' + year, (err) =>
                    if err?
                        log.error "error: #{err}"
                        callback()
                    else
                        @checkAndCreateFolder course, '/' + year + '/' + curriculum, (err) =>
                            if err?
                                log.error "error: #{err}"
                                callback()
                            else
                                @parseJson courseData, callback

    checkAndCreateFolder: (name, path, callback) ->

        Folder.allPath (err, folders) =>

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

                Folder.createNewFolder document, (err, newFolder) =>
                    if err?
                        callback err
                    else
                        log.info "folder #{name} created"
                        callback null

    parseJson: (courseData, callback) ->

        async.eachSeries courseData['File(s)'], (file, cb) =>

            @parseFile file, courseData, (err) =>
                if err?
                    log.error err
                    cb()
                else
                    cb()
        , (err) ->
            log.info "Import of course #{courseData['course']} finished"
            callback()


    parseFile: (file, courseData, callback) ->

        # if all the required values are present
        if file['dateLastModified']? and file['fileName']? and file['url']?

            name = file['fileName']
            path = '/' + courseData['year'] + '/' + courseData['curriculum'] + '/' + courseData['course']
            fullPath = "#{path}/#{name}"
            date = moment(file['dateLastModified'],'YYYY-MM-DD hh:mm:ss').toISOString()
            url = file['url']

            @checkFile name, path, fullPath, date, url, callback
        else
            log.error "error: Missing data in #{name}"
            callback()

    checkFile: (name, path, fullPath, date, url, callback) ->

        File.byFullPath key: fullPath, (err, sameFiles) =>
            return callback err if err?
            # there is already a file with the same name
            if sameFiles.length > 0

                file = sameFiles[0]
                # if the new file is newer
                if file.lastModification < date
                    # destroy it
                    file.destroyWithBinary (err) =>
                        if err?
                            log.error "Cannot destroy #{name}"
                            callback()
                        else
                            log.debug "#{name} deleted"
                            File.createNew name, path, date, url, [], (err) =>
                                if err?
                                    log.error err
                                    callback()
                                else
                                    log.info "#{name} imported"
                                    callback()
                else
                    log.debug "skipping #{name}"
                    callback()
            else
                File.createNew name, path, date, url, [], (err) =>
                    if err?
                        log.error err
                        callback()
                    else
                        log.info "#{name} imported"
                        callback()
