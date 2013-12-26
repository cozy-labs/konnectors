americano = require 'americano-cozy'
querystring = require 'querystring'
request = require 'request'
moment = require 'moment'
csv = require 'ya-csv'
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

JawboneMove = americano.getModel 'JawboneMove',
    date: Date
    activeTime: Number
    activeTimeCalories: Number
    distance: Number
    inactiveTime: Number
    longestActiveTime: Number
    longestIdleTime: Number
    steps: Number
    totalCalories: Number

JawboneMove.all = (callback) ->
    JawboneMove.request 'byDate', callback

JawboneSleep = americano.getModel 'JawboneSleep',
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

JawboneSleep.all = (callback) ->
    JawboneSleep.request 'byDate', callback

# Konnector

module.exports =

    name: "jawbone"
    fields:
        login: ""
        password: ""

    description: "Fetch Jawbone CSV data"

    models:
        moves: JawboneMove
        sleeps: JawboneSleep


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        JawboneMove.defineRequest 'byDate', map, (err) ->
            callback err if err
            JawboneSleep.defineRequest 'byDate', map, (err) ->
                callback err


    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        JawboneMove.request 'byDate', params, (err, moves) =>
            if err
                callback err

            else
                if moves.length > 0
                    start = moment(moves[0].date)
                    year = start.format('YYYY-MM-DD').substring(0, 4)
                else
                    start = moment '20110101', "YYYYMMDD"
                    year = '2011'
                login = requiredFields.login
                password = requiredFields.password

                log.info "last data import was: #{start.format()}"

                @fetchData login, password, start, year, callback


    fetchData: (login, password, start, year, callback) =>
        log.info 'Import started'

        # Get logged in
        url = "https://jawbone.com/user/signin/login"
        data =
            form:
                email: login
                pwd: password
                service: "nudge"

        request.post url, data, (err, res, body) =>
            if err
                callback err
            else if res.statusCode isnt 200
                callback new Error "Cannot connect to Jawbone server."
            else
                log.info 'Konnector successfully logged in.'
                body = JSON.parse body
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


importYear = (start, year, token, callback) ->
    log.info "import year #{year}"
    url = 'https://jawbone.com/user/settings/download_up_data?'
    url += querystring.stringify
        year: year

    options =
        uri: url
        headers:
            'x-nudge-token': token

    request.get options, (err, res, csvData) =>
        if err
            callback err
        else if res.statusCode isnt 200
            callback new Error "Error occured while fetching data"
        else
            log.info 'CSV file downloaded.'
            importData start, csvData, callback


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

    saveLine = (line, callback) ->
        line = line.split ','
        date = moment(line[columns["date"]], "YYYYMMDD")

        if date > start

            move = new JawboneMove
                date: date
                activeTime: line[columns["activeTime"]]
                activeTimeCalories: line[columns["activeTimeCalories"]]
                distance: line[columns["distance"]]
                inactiveTime: line[columns["inactiveTime"]]
                longestActiveTime: line[columns["longestActiveTime"]]
                longestIdleTime: line[columns["longestIdleTime"]]
                steps: line[columns["steps"]]
                totalCalories: line[columns["totalCalories"]]

            move.save (err) ->
                if err then callback err
                else if line[columns["asleepTime"]] isnt ''
                    sleep = new JawboneSleep
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
                    sleep.save (err) ->
                        callback err
                else
                    callback()

        else
            callback()

    recSave = ->
        if lines.length > 1
            line = lines.pop()
            saveLine line, (err) ->
                if err then callback err
                else recSave()
        else
            log.info 'CSV file imported.'
            callback()

    recSave()
