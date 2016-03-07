request = require 'request'
moment = require 'moment'
async = require 'async'
fs = require 'fs'
ical = require 'cozy-ical'
vcal = require('cozy-ical').VCalendar
NotificationHelper = require 'cozy-notifications-helper'
Folder = require '../models/folder'
File = require '../models/file'
Event = require '../models/event'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Isen"
    date: true


# Models

BASE_URL = 'https://web.isen-bretagne.fr/cc/jsonFileList/'

DEFAULT_CALENDAR = 'ISEN'

module.exports =

    name: "ISEN"
    slug: "isen"
    description: 'konnector description isen'
    vendorLink: "https://www.isen.fr/"

    fields:
        email: "text"
    models:
        file: File
        folder: Folder
        event: Event

    notification: new NotificationHelper 'konnectors'

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.start, doc
        Event.defineRequest 'byDate', map, callback


    fetch: (requiredFields, callback) ->
        log.info "Import started"
        @numItems = 0
        async.waterfall [
            (next) => @fetchIcs requiredFields, next
            (body, next) => @parseIcs body, next
            (rawEvents, boundaries, next) =>
                @processEvents rawEvents, (err, events) ->
                    # let boundaries flow to the next step
                    next err, events, boundaries
            (events, boundaries, next) =>
                @checkEventsToDelete events, boundaries, next
            (events, next) => @extractUrls events, next
            (list, next) => @processUrls list, next
        ], (err) =>
            if err?
                log.error err
                callback err
            else
                log.info "Import finished"
                notifContent = null
                if @numItems > 0
                    localizationKey = 'notification isen'
                    options = smart_count: @numItems
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


    fetchIcs: (requiredFields, callback) ->

        # return error if email is not supplied or wrongly formated
        try
            [firstPart, secondPart] = requiredFields.email.split '@'
            [firstname, lastname] = firstPart.split '.'
        catch error
            firstname = ''
            lastname  = ''

        if firstname isnt '' and lastname isnt ''
            baseMainUrl = 'https://web.isen-bretagne.fr/cc/PublishVCalendar'
            fetchUrl = "#{baseMainUrl}/#{firstname}.#{lastname}.ics"
            log.debug "Fetching #{fetchUrl}"

            options =
                method: 'GET'
                jar: true
                uri: fetchUrl
                timeout: 7000
            request options, (err, res, body) ->

                if err?
                    callback err
                else if res.statusCode is 503
                    err = "server unavailable, please try again later"
                    callback err
                else if res.statusCode is 404
                    err = "wrong first/lastname combination, user not found"
                    callback err
                else if res.statusCode is 204
                    callback null, ''
                else if res.statusCode is 500
                    err = "the remote server responded with an error"
                    callback err
                else
                    callback null, body

        else
            err = 'Firstname and/or lastname not supplied'
            callback err


    parseIcs: (mainData, callback) ->
        log.debug 'Parsing file...'
        parser = new ical.ICalParser()
        if mainData is ''
            callback null, [],
              start: moment.unix(0).toISOString()
              end: moment.unix(0).toISOString()
        else
            parser.parseString mainData, (err, calendar) ->
                if err?
                    log.error err
                    callback err
                else
                    # extract boundaries of the events range
                    # needed later to detect events to be removed
                    calendarName = calendar.model.name
                    parts = calendarName.split '/'
                    firstEvent = calendar.subComponents[1].model
                    boundaries =
                        start: moment.unix(parts[2] / 1000).toISOString()
                        end: moment.unix(parts[3] / 1000).toISOString()
                    # extract events themselves from the calendar data
                    events = Event.extractEvents calendar, DEFAULT_CALENDAR
                    callback null, events, boundaries


    # create all the events, if they don't already exist
    processEvents: (rawEvents, callback) ->
        log.debug 'Processing events, creating new ones...'
        if rawEvents.length is 0
            callback null, []
        else
            async.reduce rawEvents, [], (memo, rawEvent, next) =>
                # if there is an error, the event is not added to the memo
                Event.createOrUpdate rawEvent, (err, event) =>
                    if err?
                        # creation errors shouldn't prevent the process to run
                        # correctly because they are unlikely to happen,
                        # and have a low criticity
                        next null, memo
                    else
                        @checkEventsUpdateToNotify event, ->
                            next null, memo.concat [event]

            , (err, events) ->
                callback null, events


    # Notifications should be created for events that have changed in the next
    # two business days
    checkEventsUpdateToNotify: (event, callback) ->

        if event.beforeUpdate?

            # there are two cases: the event was in range and is not anymore
            # and the event was not in range and is now.
            oldStart = moment event.start
            newStart = moment event.beforeUpdate.start
            oldStartInRange = @isInNearFuture oldStart
            newStartInRange = @isInNearFuture newStart

            startNoLongerInRange = oldStartInRange and not newStartInRange
            startNowInRange = not oldStartInRange and newStartInRange
            if startNoLongerInRange or startNowInRange
                notificationKey = 'notification isen event changed'
                formatter = localization.t 'notification isen date format'
                options =
                    description: event.description
                    oldDate: oldStart.format formatter
                    newDate: newStart.format formatter
                notifContent = localization.t notificationKey, options

                # notification's URL action: the updated event in calendar
                urlDateFormat = newStart.format 'YYYY/M'
                url = "month/#{urlDateFormat}/#{event.id}"

                @notification.createTemporary
                    app: 'konnectors'
                    text: notifContent
                    resource:
                        app: 'calendar'
                        url: url
                , (err) ->
                    log.error err if err?
                    callback()
            else
                callback()
        else
            callback()

    # we want to check events that have changed within the next 2
    # business days, so we "jump" saturday an sunday
    isInNearFuture: (date) ->
        today = moment().startOf 'day'
        dayOfWeek = today.day()

        if dayOfWeek is 4 # thursday
            toAdd = 5
        else if dayOfWeek is 5 # friday
            toAdd = 4
        else if dayOfWeek is 6 # saturday
            toAdd = 3
        else
            toAdd = 2

        limit = moment(today).add(toAdd, 'days').endOf 'day'
        dateObject = moment date
        return dateObject.isBetween today, limit


    checkEventsToDelete: (eventsReference, boundaries, callback) ->
        log.debug 'Looking for events to delete...'
        if eventsReference.length is 0
            callback null, []
        else
            options =
                startKey: boundaries.start
                endKey: boundaries.end
            Event.getInRange options, (err, events) =>
                if err?
                    callback err
                else
                    # we can use id to check for identical events because they
                    # are defined by the remote
                    eventsReferenceId = eventsReference.map (event) -> event.id
                    removed = []
                    async.eachSeries events, (event, next) =>
                        # removes the event of ISEN's calendar if they are
                        # suposed to be in the interval and they are not
                        # anymore, and they should have happened in the future.
                        # Also if an event has not been created by the
                        # konnector, it won't be deleted
                        now = moment()
                        inTheFuture = moment(event.start).isAfter now
                        {caldavuri} = event
                        hasBeenCreatedByKonnector = caldavuri? and \
                                                   /Aurion.*/.test(caldavuri)
                        if event.id not in eventsReferenceId \
                        and event.tags[0] is DEFAULT_CALENDAR \
                        and hasBeenCreatedByKonnector \
                        and inTheFuture
                            # Destroy the event.
                            event.destroy (err) =>
                                log.error err if err?
                                removed.push event.id

                                # Then create the notification to inform the
                                # user the event has been removed only if the
                                # removed event should have taken place in the
                                # next two business days.
                                if @isInNearFuture(event.start)
                                    formatterKey = (
                                        'notification isen date format'
                                    )
                                    formatter = localization.t formatterKey
                                    start = event.start
                                    options =
                                        description: event.description
                                        date: moment(start).format formatter

                                    localeKey = \
                                        'notification isen event deleted'

                                    notifContent = localization.t(
                                        localeKey, options
                                    )

                                    @notification.createTemporary
                                        app: 'konnectors'
                                        text: notifContent
                                        resource:
                                            app: 'calendar'
                                            url: ''
                                    , (err) ->
                                        log.error err if err?
                                        # errors are not passed to avoid
                                        # breaking the loop
                                        next()
                                else
                                    next()
                        else
                            next()
                    , (err) ->
                        eventsReference = eventsReference.filter (event) ->
                            return event.id not in removed

                        callback null, eventsReference


    # extract the course URL from the events' details.
    extractUrls: (events, callback) ->
        log.debug 'Extracting course URLs from events...'
        async.reduce events, [], (memo, event, next) ->
            details = event.details
            if details? and details.length > 0
                # split all values with the hardcoded '\n'
                formattedDetails = details.split '\n'
                  # URL is always at the same position
                courseUrlIndex = formattedDetails.length - 2
                  # Get the course url
                courseUrl = formattedDetails[courseUrlIndex]
                  # if courseUrl exists and value matches with the BASE_URL
                baseCourseUrl = courseUrl?.substring 0, BASE_URL.length
                if courseUrl? and  baseCourseUrl is BASE_URL
                    if courseUrl not in memo
                        next null, memo.concat([courseUrl])
                    else
                        log.debug "skipping [#{courseUrl}]: already in list"
                        next null, memo
                else
                    log.debug "No course file found in event"
                    next null, memo
            else
                log.debug "Details not found in event"
                next null, memo

        , (err, list) ->
            err = null if list.length is 0
            callback err, list


    processUrls: (list, callback) ->
        if list.length is 0
            callback null
        else
            # fetch and process JSON data from every course
            async.eachSeries list, (url, done) =>

                async.waterfall [
                    # retrieve JSON
                    (next) => @fetchJson url, next

                    # process it
                    (courseData, next) =>
                        async.series [
                            (next) => @checkKeys courseData, next
                            (next) => @processFolder courseData, next
                            (next) => @parseCourse courseData, next
                            (next) => @checkFilesToDelete courseData, next
                        ], next
                ], (err) ->
                    log.error err if err?
                    # error should not break the loop so it can process
                    # all the courses
                    done()

            , (err) ->
                # error are logged in the process and not raised to the loop
                # but it's safer to pass it, if there is one at some point
                callback err


    fetchJson: (url, callback) ->

        options =
            method: 'GET'
            uri: url
            timeout: 7000

        log.info "Retrieving file: #{url}"
        request options, (err, res, body) ->
            if err?
                callback err
            else if body?.length is 0
                err =  'Course file empty, the course may be not available ' + \
                'for the moment'
                callback err
            else
                # JSON.parse can throw if JSON string is invalid
                try
                    courseData = JSON.parse body
                catch error
                    err = "JSON.parse error: #{error}"

                callback err, courseData


    checkKeys: (courseData, callback) ->

        # Check if all the values are present in the course file
        if courseData['File(s)']? and courseData['course']? and \
        courseData['year']? and courseData['curriculum']?
            callback()
        else
            err = 'Error: Missing course data in the file'
            callback err


    processFolder: (courseData, callback) ->

        # Check if folder arboresecense is present, otherwise create it
        # Structure is year / curriculum / course
        {year, curriculum, course} = courseData

        async.series [
            (next) =>
                path = ''
                @checkAndCreateFolder year, path, next
            (next) =>
                path = "/#{year}"
                @checkAndCreateFolder curriculum, path, next
            (next) =>
                path = "/#{year}/#{curriculum}"
                @checkAndCreateFolder course, path, next
        ], callback


    checkAndCreateFolder: (name, path, callback) ->

        Folder.allPath (err, folders) ->

            fullpath = "#{path}/#{name}"
            if err?
                callback err
            # if the folder exists
            else if fullpath in folders
                callback()
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
                    console.log err
                    if err?
                        callback err
                    else
                        log.info "Folder #{name} created"
                        callback()


    parseCourse: (courseData, callback) ->
        # this loop is fault tolerant, so it will process all the elements
        # even if there is an error
        async.eachSeries courseData['File(s)'], (file, done) =>

            @checkFile file, courseData, (err) ->
                log.error err if err?
                done()

        , (err) ->
            log.info "Import of course #{courseData['course']} finished"
            # there should never be an error, but we pass it to be warn in
            # case a breaking change occurs
            callback err


    checkFile: (file, courseData, callback) ->

        {dateLastModified, fileName, url} = file
        if not dateLastModified? or not fileName? or not url?
            err = "Error: Missing data in #{fileName}"
            return callback err

        {year, curriculum, course} = courseData
        path = "/#{year}/#{curriculum}/#{course}"
        fullPath = "#{path}/#{fileName}"
        dateFormat = 'YYYY-MM-DD hh:mm:ss'
        date = moment(dateLastModified, dateFormat).toISOString()

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
                            callback err
                        else
                            log.debug "#{fileName} deleted"
                            @createFile fileName, path, date, url, [], callback
                else
                    log.debug "skipping #{fileName} (not updated)"
                    callback()
            else
                @createFile fileName, path, date, url, [], callback


    createFile: (fileName, path, date, url, tags, callback) ->
        @numItems++
        File.createNew fileName, path, url, tags, (err) ->
            if err?
                callback err
            else
                log.info "#{fileName} imported"
                callback()


    checkFilesToDelete: (courseData, callback) ->

        {year, curriculum, course} = courseData
        path = "/#{year}/#{curriculum}/#{course}"
        log.info "Check if there are files to delete"
        File.byFolder key: path, (err, files) ->
            if err?
                callback err
            else
                referenceFiles = courseData['File(s)'] or []
                referenceFilesName = referenceFiles.map (file) -> file.fileName

                # For each files of the folder, check if they are still in the
                # list of reference. If not, the file should be deleted.
                async.eachSeries files, (file, next) ->
                    if file.name not in referenceFilesName
                        log.info "File #{file.name} not found in list..."
                        # error is not passed to prevent the loop from breaking
                        file.destroyWithBinary (err) ->
                            log.eror err if err?
                            log.info "...file #{file.name} destroyed"
                            next()
                    else
                        next()
                , callback

