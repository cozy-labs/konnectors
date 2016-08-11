cozydb = require 'cozydb'
request = require 'request'
moment = require 'moment'
crypto = require 'crypto'
async = require 'async'

localization = require '../lib/localization_manager'

# helpers

log = require('printit')
    date: true
    prefix: 'withings'

hexMd5 = (name) ->
    if name?
        try
            crypto.createHash('md5').update(name).digest('hex')
        catch
            ''
    else
        ''

# Urls

authUrl = 'https://auth.withings.com/fr/'
accountUrl = 'https://healthmate.withings.com/index/service/account'
measureUrl = 'https://healthmate.withings.com/index/service/measure'
activityUrl = 'https://healthmate.withings.com/index/service/v2/activity'
aggregateUrl = 'https://healthmate.withings.com/index/service/v2/aggregate'

# Models

Weight = cozydb.getModel 'Weight',
    date: Date
    weight: Number
    leanWeight: Number
    fatWeight: Number
    user: String
    vendor: {type: String, default: 'Withings'}

HeartBeat = cozydb.getModel 'HeartBeat',
    date: Date
    value: Number
    user: String
    vendor: {type: String, default: 'Withings'}

BloodPressure = cozydb.getModel 'BloodPressure',
    date: Date
    systolic: Number
    diastolic: Number
    user: String
    vendor: {type: String, default: 'Withings'}

Steps = require '../models/steps'
Sleep = require '../models/sleep'

Weight.all = (callback) ->
    Weight.request 'byDate', callback

HeartBeat.all = (callback) ->
    HeartBeat.request 'byDate', callback

BloodPressure.all = (callback) ->
    BloodPressure.request 'byDate', callback


# Konnector

module.exports =

    name: "Withings"
    slug: "withings"
    description: 'konnector description withings'
    vendorLink: "https://www.withings.com/"

    fields:
        email: "text"
        password: "password"
    models:
        scalemeasure: Weight
        heartbeat: HeartBeat
        bloodpressure: BloodPressure
        steps: Steps
        sleep: Sleep


    # Define model requests.
    init: (callback) ->

        map = (doc) -> emit doc.date, doc
        async.series [
            (done) -> Weight.defineRequest 'byDate', map, done
            (done) -> HeartBeat.defineRequest 'byDate', map, done
            (done) -> BloodPressure.defineRequest 'byDate', map, done
        ], callback

    # Set start and end date to fetch all data.
    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        log.info 'import started'

        email = requiredFields.email
        password = requiredFields.password

        end = Math.ceil((new Date).getTime() / 1000)
        start = moment()
        start = start.year 2008
        start = start.month 0
        start = start.date 1
        start = Math.ceil(start.valueOf() / 1000)

        @fetchData email, password, start, end, (err) ->
            log.info 'import finished'
            callback err


    # Fetch data from withings website and save them as Cozy objects
    fetchData: (email, password, start, end, callback) ->

        data =
            action: 'get'
            appliver: 2014011713
            appname: 'wiscale'
            apppfm: 'web'
            sessionid: null

        # Get auth token.
        onceUrl = 'https://auth.withings.com/index/service/once/'
        request.post onceUrl, form: data, (err, res, body) ->
            return callback err if err

            body = JSON.parse body
            once = body.body.once
            data =
                email: email
                password: password
                passClear: password
                hash: hexMd5(email + ":" + hexMd5(password) + ":" + once)
                once: once

            # Authenticate user.
            request.post authUrl, form: data, (err, res, body) ->
                return callback err if err
                if not res.headers['set-cookie']?
                    log.error 'Authentification error'
                    return callback('bad credentials')

                sessionid = \
                    res.headers['set-cookie'][1].split(';')[0].split('=')[1]

                options =
                    strictSSL: false
                    form:
                        action: 'getuserslist'
                        appliver: '20140428120105'
                        appname: 'my2'
                        apppfm: 'web'
                        listmask: '5'
                        recurse_devtype: '1'
                        recurse_use: '1'
                        sessionid: sessionid

                # Get user id.
                request.post accountUrl, options, (err, res, body) ->
                    return callback err if err

                    body = JSON.parse body
                    user = body.body.users[0]
                    userid = user.id
                    username = "#{user.firstname} #{user.lastname}"

                    options =
                        strictSSL: false
                        form:
                            action: 'getmeas'
                            appliver: '20140428120105'
                            appname: 'my2'
                            apppfm: 'web'
                            category: 1
                            limit: 2000
                            offset: 0
                            meastype: '12,35'
                            sessionid: sessionid
                            startdate: 0
                            enddate: end
                            userid: userid

                    # Fetch withings body measures
                    request.post measureUrl, options, (err, res, body) ->
                        return callback err if err

                        measures = JSON.parse body
                        if not measures.body?
                            log.error "Measures have no body"
                            return callback()

                        saveBodyMeasures measures.body.measuregrps, (err) ->
                            return callback err if err

                            startDate = moment()
                                .year(2014)
                                .month(0)
                                .date(1)
                                .format('YYYY-MM-DD')

                            # Fetch withings activity measures
                            options =
                                strictSSL: false
                                form:
                                    sessionid: sessionid
                                    userid: userid
                                    range: '1'
                                    meastype: '36,40'
                                    appname: 'my2'
                                    appliver: '20140428120105'
                                    apppfm: 'web'
                                    action: 'getbyuserid'
                                    startdateymd: startDate
                                    enddateymd: moment().format('YYYY-MM-DD')

                            onMeasures = (err, res, body) ->
                                return callback err if err
                                measures = JSON.parse body
                                saveActivityMeasures measures, ->
                                    options =
                                        sessionid: sessionid
                                        userid: userid

                                    fetchAndSaveSleepMeasures options, callback

                            request.post aggregateUrl, options, onMeasures


fetchAndSaveSleepMeasures = (options, callback) ->
    opts =
        strictSSL: false
        form:
            sessionid: options.sessionid
            userid: options.userid
            subcategory: 37
            startdateymd: '2013-12-24'
            enddateymd: moment().format 'YYYY-MM-DD'
            appname: 'my2'
            appliver: '36871d49'
            apppfm: 'web'
            action: 'getbyuserid'

    log.info 'Fetching sleep data...'
    request.post activityUrl, opts, (err, res, body) ->
        return callback err if err
        log.info 'Fetching sleep data done.'
        measures = JSON.parse body
        saveSleepMeasures measures.body.series, callback


saveSleepMeasures = (measures, callback) ->
    sleepsMeasures = []
    for measure in measures
        sleepsMeasures.push new Sleep
            vendor: 'Withings'
            date: moment measure.date, 'YYYY-MM-DD'
            awakeDuration: measure.data.wakeupduration
            lightSleepDuration: measure.data.lightsleepduration
            deepSleepDuration: measure.data.deepsleepduration
            awakeTime: measure.data.wakeupcount
            sleepDuration: (
                measure.data.lightsleepduration + \
                measure.data.deepsleepduration
            )
    log.info "#{measures.length} found"

    Sleep.all (err, sleeps) ->
        return callback err if err

        sleepMap = {}
        for sleep in sleeps
            date = moment(sleep.date).format 'YYYY-MM-DD'
            sleepMap[date] = true

        SleepsToSave = sleepsMeasures.filter (measure) ->
            date = moment(measure.date).format 'YYYY-MM-DD'
            return not sleepMap[date]?

        log.info "Saving sleeps..."
        async.eachSeries sleepsToSave, (sleep, next) ->
            Sleep.create sleep, next
        , (err) ->
            log.info "#{sleepsToSave.length} new sleep measures saved."
            callback()


hashMeasuresByDate = (measures) ->
    hash = {}
    for measure in measures
        date = moment measure.date
        hash[date] = true
    hash


saveBodyMeasures = (measures, callback) ->

    processData = (scaleMeasures, heartBeats, bloodPressures) ->
        scaleMeasureHash = hashMeasuresByDate scaleMeasures
        heartBeatHash = hashMeasuresByDate heartBeats
        bloodPressureHash = hashMeasuresByDate bloodPressures

        log.debug 'analyse new measures'

        # Here we keep only new measure, it doesn't save the same measure
        # twice.
        measuresToSave = []
        heartBeatsToSave = []
        bloodPressuresToSave = []
        for measuregrp in measures
            date = moment(measuregrp.date * 1000)

            scaleMeasure = new Weight
            scaleMeasure.date = date
            heartBeat = new HeartBeat
            heartBeat.date = date
            bloodPressure = new BloodPressure
            bloodPressure.date = date
            for measure in measuregrp.measures
                switch measure.type
                    when 1 then scaleMeasure.weight = measure.value
                    when 5 then scaleMeasure.leanWeight = measure.value
                    when 8 then scaleMeasure.fatWeight = measure.value
                    when 9 then bloodPressure.diastolic = measure.value
                    when 10 then bloodPressure.systolic = measure.value
                    when 11 then heartBeat.value = measure.value

            if scaleMeasure.weight? and not scaleMeasureHash[date]?
                measuresToSave.push scaleMeasure

            if heartBeat.value? and not heartBeatHash[date]?
                heartBeatsToSave.push heartBeat

            if bloodPressure.systolic? and not bloodPressureHash[date]?
                bloodPressuresToSave.push bloodPressure

        log.info "#{measuresToSave.length} weight measures to save"
        log.info "#{heartBeatsToSave.length} heartbeat measures to save"
        log.info(
            "#{bloodPressuresToSave.length} blood pressure measures to save")

        saveAll = (modelClass, models, done) ->
            async.eachSeries models, (model, callback) ->
                modelClass.create model, callback
            , (err) ->
                done err

        log.info 'Save weights...'
        saveAll Weight, measuresToSave, (err) ->
            log.info 'Weights saved...'
            return callback err if err

            log.info 'Save heartbeats...'
            saveAll HeartBeat, heartBeatsToSave, (err) ->
                log.info 'Heartbeats saved...'
                return callback err if err

                log.info 'Save blood pressures...'
                saveAll BloodPressure, bloodPressuresToSave, (err) ->
                    log.info 'Blood pressures saved...'
                    return callback err if err

                    notifContent = null
                    if measuresToSave.length > 0
                        localizationKey = 'notification measures'
                        options = smart_count: measuresToSave.length
                        notifContent = localization.t localizationKey, options
                    callback null, notifContent


    log.debug 'fetch old measures'
    Weight.all (err, scaleMeasures) ->
        return callback err if err

        HeartBeat.all (err, heartBeats) ->
            return callback err if err

            BloodPressure.all (err, bloodPressures) ->
                return callback err if err
                processData scaleMeasures, heartBeats, bloodPressures


saveActivityMeasures = (measures, callback) ->

    log.info 'Processing activity measures...'
    processData = (stepsMeasures) ->

        stepsHash = hashMeasuresByDate stepsMeasures

        newSteps = measures.body?.series?.type_36
        newDistances = measures.body?.series?.type_40

        if not newSteps? and not newDistances?
            callback()

        else
            stepsToSave = []
            for date, valueObj of newSteps
                dateAsMom = moment date
                steps = valueObj.sum

                if not stepsHash[dateAsMom]?
                    stepMeasure = new Steps
                    stepMeasure.date = dateAsMom
                    stepMeasure.steps = steps
                    stepMeasure.vendor = 'Withings'

                    if newDistances[date]?
                        stepMeasure.distance = newDistances[date].sum

                    stepsToSave.push stepMeasure

            log.info "Found #{stepsToSave.length} new steps measures to save!"
            saveInstance = (model, cb) ->
                Steps.create model, cb

            async.forEach stepsToSave, saveInstance, (err) ->
                return callback err if err?

                log.info 'Steps measures saved.'
                notifContent = null
                if stepsToSave.length
                    localizationKey = 'notification withings'
                    options = smart_count: stepsToSave.length
                    notifContent = localization.t localizationKey, options
                callback null, notifContent


    log.debug 'Fetching former activity measures...'
    Steps.all (err, stepsMeasures) ->
        return callback err if err
        processData stepsMeasures



# Fetch sleep data from another url (it looks it's required by the withings
# API).
fetchAndSaveSleepMeasures = (options, callback) ->
    opts =
        strictSSL: false
        form:
            sessionid: options.sessionid
            userid: options.userid
            subcategory: 37
            startdateymd: '2013-12-24'
            enddateymd: moment().format 'YYYY-MM-DD'
            appname: 'my2'
            appliver: '36871d49'
            apppfm: 'web'
            action: 'getbyuserid'

    log.info 'Fetching sleep data...'
    request.post activityUrl, opts, (err, res, body) ->
        return callback err if err
        log.info 'Fetching sleep data done.'
        measures = JSON.parse body
        saveSleepMeasures measures.body.series, callback


# Save sleep measures if they are not already recorded.
saveSleepMeasures = (measures, callback) ->
    sleepsMeasures = []
    for measure in measures
        sleepsMeasures.push new Sleep
            vendor: 'Withings'
            date: moment measure.date, 'YYYY-MM-DD'
            awakeDuration: measure.data.wakeupduration
            lightSleepDuration: measure.data.lightsleepduration
            deepSleepDuration: measure.data.deepsleepduration
            awakeTime: measure.data.wakeupcount
            sleepDuration: (
                measure.data.lightsleepduration + \
                measure.data.deepsleepduration
            )
    log.info "#{measures.length} found"

    Sleep.all (err, sleeps) ->
        return callback err if err

        sleepMap = {}
        for sleep in sleeps
            date = moment(sleep.date).format 'YYYY-MM-DD'
            sleepMap[date] = true

        sleepsToSave = sleepsMeasures.filter (measure) ->
            date = moment(measure.date).format 'YYYY-MM-DD'
            return not sleepMap[date]?

        log.info "Saving sleeps..."
        async.eachSeries sleepsToSave, (sleep, next) ->
            Sleep.create sleep, next
        , (err) ->
            log.info "#{sleepsToSave.length} new sleep measures saved."
            callback()
