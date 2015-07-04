cozydb = require 'cozydb'
querystring = require 'querystring'
request = require 'request'
moment = require 'moment'
async = require 'async'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Jawbone"
    date: true


dataFields =
    DATE: "date"
    m_active_time: "activeTime"
    m_calories: "activeTimeCalories"
    m_distance: "distance"
    m_inactive_time: "inactiveTime"
    m_lcat: "longestActiveTime"
    m_lcit: "longestIdleTime"
    m_steps: "steps"
    m_total_calories: "totalCalories"
    s_asleep_time: "asleepTime"
    s_awake: "awakeDuration"
    s_awake_time: "awakeTime" # at which time user woke up
    s_awakenings: "awakeningCount"
    s_bedtime: "bedTime" # at which time user went to bed
    s_deep: "deepSleepDuration"
    s_duration: "sleepDuration"
    s_light: "lightSleepDuration"
    s_quality: "sleepQuality"


# Models

Steps = cozydb.getModel 'Steps',
    date: Date
    activeTime: Number
    activeTimeCalories: Number
    distance: Number
    inactiveTime: Number
    longestActiveTime: Number
    longestIdleTime: Number
    steps: Number
    totalCalories: Number
    vendor: {type: String, default: 'Jawbone'}

Steps.all = (callback) ->
    Steps.request 'byDate', callback

Sleep = cozydb.getModel 'Sleep',
    date: Date
    asleepTime: Number
    awakeDuration: Number
    awakeTime: Number
    awakeningCount: Number
    bedTime: Number
    deepSleepDuration: Number
    lightSleepDuration: Number
    sleepDuration: Number
    sleepQuality: Number
    vendor: {type: String, default: 'Jawbone'}

Sleep.all = (callback) ->
    Sleep.request 'byDate', callback

# Konnector

module.exports =

    name: "Jawbone"
    slug: "jawbone"
    description: 'konnector description jawbone'
    vendorLink: "https://jawbone.com/up"

    fields:
        login: "text"
        password: "password"

    models:
        moves: Steps
        sleeps: Sleep


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        Steps.defineRequest 'byDate', map, (err) ->
            callback err if err
            Sleep.defineRequest 'byDate', map, (err) ->
                callback err


    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        Steps.request 'byDate', params, (err, moves) =>
            if err
                callback err

            else
                if moves.length > 0
                    start = moment(moves[0].date)
                    year = start.format('YYYY-MM-DD').substring 0, 4
                else
                    start = moment '20110101', 'YYYYMMDD'
                    year = '2011'

                login = requiredFields.login
                password = requiredFields.password

                log.info "last data import was: #{start.format()}"

                # Destroy last imported record (it has probably changed since)
                if moves.length > 0
                    start.hours 0, 0, 0, 0
                    moves[0].destroy (err) =>
                        Sleep.request 'byDate', params, (err, sleeps) =>
                            isSameDate = sleeps[0].date is moves[0].date
                            if sleeps.length > 0 and isSameDate
                                sleeps[0].destroy (err) =>
                                    if err
                                        callback err
                                    else
                                        @fetchData(
                                            login, password,
                                            start, year, callback
                                        )
                            else
                                @fetchData(
                                    login, password,
                                    start, year, callback
                                )

                else
                    @fetchData login, password, start, year, callback


    fetchData: (login, password, start, year, callback) ->
        log.info 'Import started'

        # Get logged in
        url = "https://jawbone.com/user/signin/login"
        data =
            form:
                email: login
                pwd: password
                service: "nudge"
        request.post url, data, (err, res, body) ->
            if err
                callback err
            else if res.statusCode isnt 200
                callback new Error "Cannot connect to Jawbone server."
            else
                body = JSON.parse body
                if body.error?
                    if body.error.msg?
                        log.error body.error.msg
                    else
                        log.error 'Bad credentials'
                    callback('bad credentials')
                else
                    log.info 'Konnector successfully logged in.'
                    token = body.token

                    # Get CSV file containing all users data.
                    # Would be proper to use Jawbone API but it would be more
                    # painful too.
                    currentYear = moment().year()
                    startYear = parseInt year
                    recImport = ->
                        if startYear <= currentYear
                            importYear start, startYear, token, ->
                                startYear++
                                recImport()
                        else
                            callback()

                    recImport()


# Import data for a given year. Row date should be after *start*.
importYear = (start, year, token, callback) ->
    log.info "import year #{year}"
    url = 'https://jawbone.com/user/settings/download_up_data?'
    url += querystring.stringify
        year: year

    options =
        uri: url
        headers:
            'x-nudge-token': token

    request.get options, (err, res, csvData) ->
        if err
            callback err
        else if res.statusCode isnt 200
            callback new Error "Error occured while fetching data"
        else
            log.info 'CSV file downloaded.'
            importData start, csvData, callback


# Create cozy data from a CSV string.
importData = (start, csvData, callback) ->
    lines = csvData.split '\n'
    headers = lines[0]
    columns = {}
    j = 0
    for header in headers.split ','
        attr = dataFields[header]
        columns[attr] = j if attr?
        j++
    columns["date"] = 0
    numItems = 0
    saveLine = (line, callback) ->
        line = line.split ','
        date = moment(line[columns["date"]], "YYYYMMDD")

        if date.toDate() >= start.toDate()

            move = new Steps
                date: date
                activeTime: line[columns["activeTime"]]
                activeTimeCalories: line[columns["activeTimeCalories"]]
                distance: line[columns["distance"]]
                inactiveTime: line[columns["inactiveTime"]]
                longestActiveTime: line[columns["longestActiveTime"]]
                longestIdleTime: line[columns["longestIdleTime"]]
                steps: line[columns["steps"]]
                totalCalories: line[columns["totalCalories"]]
            numItems++
            move.save (err) ->
                if err then callback err
                else if line[columns["asleepTime"]] isnt ''
                    log.debug "move imported"
                    log.debug move
                    sleep = new Sleep
                        date: date
                        asleepTime: line[columns["asleepTime"]]
                        awakeDuration: line[columns["awakeDuration"]]
                        awakeTime: line[columns["awakeTime"]]
                        awakeningCount: line[columns["awakeningCount"]]
                        bedTime: line[columns["bedTime"]]
                        deepSleepDuration: line[columns["deepSleepDuration"]]
                        sleepDuration: line[columns["sleepDuration"]]
                        lightSleepDuration: line[columns["lightSleepDuration"]]
                        sleepQuality: line[columns["sleepQuality"]]
                    numItems++
                    sleep.save (err) ->
                        if err
                            callback err
                        else
                            log.debug "sleep imported"
                            log.debug sleep
                            callback()
                else
                    log.debug "move imported"
                    log.debug move
                    callback()

        else
            callback()

    async.eachSeries lines, saveLine, (err) ->
        log.info 'CSV file imported.'

        notifContent = null
        if numItems > 0
            localizationKey = 'notification jawbone'
            options = smart_count: numItems
            notifContent = localization.t localizationKey, options

        callback err, notifContent
