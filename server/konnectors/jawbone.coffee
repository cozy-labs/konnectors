americano = require 'americano-cozy'
qs = require 'querystring'
request = require 'request'
moment = require 'moment'
csv = require 'ya-csv'
log = require('printit')()


dataFields =
    m_active_time: "activeTime"
    m_calories: "activeTimeCalories"
    m_distance: "distance"
    m_inactive_time: "inactiveTime"
    m_lcat: "longestActiveTime"
    m_lcit: "longestIdleTime"
    m_steps: "steps"
    m_total_calories: "totalCalories"
    m_workout_count: "workoutCount"
    m_workout_time: "workoutTime"
    o_count: "workoutCount"
    o_mood: "mood"
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

JawboneActivity = americano.getModel 'JawboneActivity',
    date: Date
    activeTime: Number
    activeTimeCalories: Number
    distance: Number
    inactiveTime: Number
    longestActiveTime: Number
    longestIdleTime: Number
    steps: Number
    totalCalories: Number
    workoutCount: Number
    mood: Number
    asleepTIme: Number
    awakeDuration: Number
    awakeTime: Number
    awakeningCount: Number
    bedTime: Number
    deepSleepDuration: Number
    lightSleepDuration: Number
    sleepDuration: Number
    sleepQuality: Number

JawboneActivity.all = (callback) ->
    JawboneActivity.request 'byDate', callback

JawboneActivity.destroyAll = (callback) ->
    JawboneActivity.requestDestroy 'byDate', callback


# Konnector

module.exports =

    name: "jawbone"
    fields:
        login: ""
        password: ""

    description: "Fetch Jawbone CSV data"

    models:
        activities: JawboneActivity

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit(doc.date, doc)
        JawboneActivity.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->
        JawboneActivity.request 'byDate', limit: 1, (err, activities) =>
            if err
                callback err

            else
                if activities.length > 0
                    start = moment(activities[0].date).format 'YYYY-MM-DD'
                    year = start.substring(0, 4)
                else
                    start = '2011-01-01'
                    year = '2011'
                login = requiredFields.login
                password = requiredFields.password

                @fetchData login, password, start, year, callback

    fetchData: (login, password, start, year, callback) ->
        url = "https://jawbone.com/user/signin/login"
        data =
            form:
                email: login
                pwd: password
                service: "nudge"
        request.post url, data, (err, res, body) ->
            if err
                callback err
            else
                body = JSON.parse body
                token = body.token
                xid = body.user.xid
                path = 'user/settings/download_up_data?'
                path += qs.stringify
                    year: 2013

                url = 'https://jawbone.com/user/settings/download_up_data?year=2013'

                options =
                    uri: url
                    headers:
                        'x-nudge-token': token

                stream = request.get options, (err, res, body) ->
                    console.log body
                    callback err
