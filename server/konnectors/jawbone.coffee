cozydb = require 'cozydb'
querystring = require 'querystring'
request = require 'request'
moment = require 'moment'
async = require 'async'

fetcher = require '../lib/fetcher'
localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Jawbone"
    date: true


# Hash used to match fields from the Jawbone CSV files and the sleep and Steps
# model fields.
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
#
Steps = require '../models/steps'
Sleep = require '../models/sleep'


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
        callback()

    fetch: (requiredFields, callback) ->
        entries = {}
        data = {}
        log.info 'Import started'

        fetcher
            .new()
            .use(buildExistingHashes)
            .use(logIn)
            .use(getCSVs)
            .use(saveData)
            .args(requiredFields, entries, data)
            .fetch (err, fields, entries, data) ->
                if err
                    log.error 'An error occured'
                    log.raw err

                log.info "Import finished"

                notifContent = null

                if entries? and (entries.numSteps > 0 or entries.numSleep > 0)
                    localizationKey = 'notification measures'
                    options =
                        smart_count: entries.numSteps + entries.numSleep
                    notifContent = localization.t localizationKey, options
                callback err, notifContent


# This layer marks every date where the entry already exists.
buildExistingHashes = (requiredFields, entries, data, next) ->
    Steps.all (err, steps) ->
        return next err if err

        Sleep.all (err, sleeps) ->
            return next err if err

            entries.stepsHash = {}
            for step in steps
                date = moment(step.date).startOf('day').toISOString()
                entries.stepsHash[date] = true

            entries.sleepHash = {}
            for sleep in sleeps
                date = moment(sleep.date).startOf('day').toISOString()
                entries.sleepHash[date] = true

            next()


# Log in into the Jawbone website. It will leads to grab an auth token
# that will be required for every requests.
logIn = (requiredFields, entries, data, next) ->
    login = requiredFields.login
    password = requiredFields.password

    url = "https://jawbone.com/user/signin/login"
    options =
        jar: true
        form:
            email: login
            pwd: password
            service: "nudge"

    log.info 'Attempt to log in'
    request.post url, options, (err, res, body) ->

        if err
            next err

        else if res.statusCode isnt 200
            next new Error "Cannot connect to Jawbone server."

        else
            body = JSON.parse body
            if body.error?
                if body.error.msg?
                    log.error body.error.msg
                else
                    log.error 'Bad credentials'
                next new Error 'bad credentials'
            else
                log.info 'Konnector successfully logged in.'
                data.token = body.token
                next()


# Download csv data from the Jawbone website. It's easier to parse and deal
# with than with api.
getCSVs = (requiredFields, entries, data, next) ->
    currentYear = moment().year()
    entries.columns = {}
    entries.lines = []

    async.eachSeries [2013..currentYear], (year, done) ->
        log.info "import year #{year}"
        url = 'https://jawbone.com/user/settings/download_up_data?'
        url += querystring.stringify
            year: year

        options =
            jar: true
            uri: url
            headers:
                'x-nudge-token': data.token

        request.get options, (err, res, csvData) ->

            if err
                done err

            else if res.statusCode isnt 200
                done new Error "Error occured while fetching data"

            else
                lines = csvData.split '\n'
                headers = lines.shift 0
                columns = date: 0
                j = 0

                for line in lines
                    entries.lines.push line.split(',')

                for header in headers.split ','
                    attr = dataFields[header]
                    columns[attr] = j if attr?
                    j++

                entries.columns[year] = columns

                log.info "CSV file downloaded for year #{year}."
                done()
    , (err) ->
        next err


# Build data structure from csv files, then save all data to database.
# An entry is created only if value is superior to 0 and if there is no entry
# already present in database.
saveData = (requiredFields, entries, data, next) ->
    log.info "Start saving data."
    log.info "Checking #{entries.lines.length} entries."
    stepsToSave = []
    sleepToSave = []

    for line in entries.lines
        date = moment(line[0], "YYYYMMDD").toISOString()
        year = moment(line[0], "YYYYMMDD").year()
        columns = entries.columns[parseInt(year)]

        if columns?
            if line[columns.steps]? \
            and not(line[columns.steps] in ['', '0'])\
            and not entries.stepsHash[date]
                log.info "New steps entry for #{date}"
                stepsToSave.push
                    date: date
                    activeTime: line[columns.activeTime]
                    activeTimeCalories: line[columns.activeTimeCalories]
                    distance: line[columns.distance]
                    inactiveTime: line[columns.inactiveTime]
                    longestActiveTime: line[columns.longestActiveTime]
                    longestIdleTime: line[columns.longestIdleTime]
                    steps: line[columns.steps]
                    totalCalories: line[columns.totalCalories]
                    vendor: 'Jawbone'

            if line[columns.asleepTime]? \
            and not(line[columns.asleepTime] in ['', '0'])\
            and not entries.sleepHash[date]
                log.info "New sleep entry for #{date}"
                sleepToSave.push
                    date: date
                    asleepTime: line[columns.asleepTime]
                    awakeDuration: line[columns.awakeDuration]
                    awakeTime: line[columns.awakeTime]
                    awakeningCount: line[columns.awakeningCount]
                    bedTime: line[columns.bedTime]
                    deepSleepDuration: line[columns.deepSleepDuration]
                    sleepDuration: line[columns.sleepDuration]
                    lightSleepDuration: line[columns.lightSleepDuration]
                    sleepQuality: line[columns.sleepQuality]
                    vendor: 'Jawbone'

    log.info "Save steps to database"
    async.eachSeries stepsToSave, (steps, done) ->
        Steps.create steps, done
    , (err) ->
        return next err if err

        log.info "Save sleeps to database"
        async.eachSeries sleepToSave, (sleep, done) ->
            Sleep.create sleep, done
        , (err) ->
            return next err if err

            entries.numSteps = numSteps = stepsToSave.length
            entries.numSleep = numSleep = sleepToSave.length
            log.info "#{numSteps} data saved."
            log.info "#{numSleep} data saved."
            next()
