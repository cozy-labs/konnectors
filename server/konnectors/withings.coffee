americano = require 'americano-cozy'
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
        crypto.createHash('md5').update(name).digest('hex')
    else
        ''

# Urls

authUrl = 'https://auth.withings.com/fr/'
accountUrl = 'https://healthmate.withings.com/index/service/account'
measureUrl = 'https://healthmate.withings.com/index/service/measure'
aggregateUrl = 'https://healthmate.withings.com/index/service/v2/aggregate'

# Models

Weight = americano.getModel 'Weight',
    date: Date
    weight: Number
    leanWeight: Number
    fatWeight: Number
    user: String
    vendor: {type: String, default: 'Withings'}

HeartBeat = americano.getModel 'HeartBeat',
    date: Date
    value: Number
    user: String
    vendor: {type: String, default: 'Withings'}

BloodPressure = americano.getModel 'BloodPressure',
    date: Date
    systolic: Number
    diastolic: Number
    user: String
    vendor: {type: String, default: 'Withings'}

Steps = americano.getModel 'Steps',
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

Weight.all = (callback) ->
    Weight.request 'byDate', callback

HeartBeat.all = (callback) ->
    HeartBeat.request 'byDate', callback

BloodPressure.all = (callback) ->
    BloodPressure.request 'byDate', callback

Steps.all = (callback) ->
    Steps.request 'byDate', callback

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


    # Define model requests.
    init: (callback) ->

        map = (doc) -> emit doc.date, doc
        async.series [
            (done) -> Weight.defineRequest 'byDate', map, done
            (done) -> HeartBeat.defineRequest 'byDate', map, done
            (done) -> BloodPressure.defineRequest 'byDate', map, done
            (done) -> Steps.defineRequest 'byDate', map, done
        ], callback

    # Set start and end date to fetch all data.
    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        log.info 'import started'

        email = requiredFields.email
        password = requiredFields.password

        end = Math.ceil((new Date).getTime() / 1000)
        start = moment()
        start = start.years 2008
        start = start.month 0
        start = start.date 1
        start = Math.ceil(start.valueOf() / 1000)

        @fetchData email, password, start, end, callback
        log.info 'import finished'

    # Fetch data from withings website and save them as Cozy objects
    fetchData: (email, password, start, end, callback) =>

        data =
            action: 'get'
            appliver: 2014011713
            appname: 'wiscale'
            apppfm: 'web'
            sessionid: null

        # Get auth token.
        onceUrl = 'https://auth.withings.com/index/service/once/'
        request.post onceUrl, form: data, (err, res, body) =>
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
            request.post authUrl, form: data, (err, res, body) =>
                return callback err if err
                if not res.headers['set-cookie']?
                    log.error 'Authentification error'
                    return callback('bad credentials')

                sessionid = \
                    res.headers['set-cookie'][1].split(';')[0].split('=')[1]

                data =
                    action: 'getuserslist'
                    appliver: '20140428120105'
                    appname: 'my2'
                    apppfm: 'web'
                    listmask: '5'
                    recurse_devtype: '1'
                    recurse_use: '1'
                    sessionid: sessionid

                # Get user id.
                request.post accountUrl, form: data, (err, res, body) =>
                    return callback err if err

                    body = JSON.parse body
                    user = body.body.users[0]
                    userid = user.id
                    username = "#{user.firstname} #{user.lastname}"

                    data =
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
                    request.post measureUrl, form: data, (err, res, body) =>
                        return callback err if err
                        measures = JSON.parse body
                        saveBodyMeasures measures.body.measuregrps, (err) ->
                            return callback err if err

                            # Fetch withings activity measures
                            data =
                                sessionid: sessionid
                                userid: userid
                                range: '1'
                                meastype: '36,40'
                                appname: 'my2'
                                appliver: '20140428120105'
                                apppfm: 'web'
                                action: 'getbyuserid'
                                startdateymd: moment().years(2014).month(0).date(1).format('YYYY-MM-DD')
                                enddateymd: moment().format('YYYY-MM-DD')

                            request.post aggregateUrl, form: data, (err, res, body) =>
                                return callback err if err
                                measures = JSON.parse body
                                saveActivityMeasures measures, callback


hashMeasuresByDate = (measures) ->
    hash = {}
    for m in measures
        date = moment m.date
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

        log.debug "#{measuresToSave.length} weight measures to save"
        log.debug "#{heartBeatsToSave.length} heartbeat measures to save"
        log.debug "#{bloodPressuresToSave.length} blood pressure measures to save"

        saveAll = (models, done) ->
            async.forEach models, (model, callback) ->
                model.save callback
            , (err) ->
                done err

        log.debug 'Save weights...'
        saveAll measuresToSave, (err) ->
            log.debug 'Weights saved...'
            return callback err if err

            log.debug 'Save heartbeats...'
            saveAll heartBeatsToSave, (err) ->
                log.debug 'Heartbeats saved...'
                return callback err if err

                log.debug 'Save blood pressures...'
                saveAll bloodPressuresToSave, (err) ->
                    log.debug 'Blood pressures saved...'
                    return callback err if err

                    notifContent = null
                    if measuresToSave.length > 0
                        localizationKey = 'notification withings'
                        options = smart_count: measuresToSave.length
                        notifContent = localization.t localizationKey, options
                    callback null, notifContent

    log.debug 'fetch old measures'
    Weight.all (err, scaleMeasures) ->
        return callback err if err
        console.log scaleMeasures
        HeartBeat.all (err, heartBeats) ->
            return callback err if err
            BloodPressure.all (err, bloodPressures) ->
                return callback err if err
                processData scaleMeasures, heartBeats, bloodPressures


saveActivityMeasures = (measures, callback) ->

    console.log 'Processing activity measures...'
    processData = (stepsMeasures) ->

        stepsHash = hashMeasuresByDate stepsMeasures

        newSteps = measures.body?.series?.type_36
        newDistances = measures.body?.series?.type_40

        return callback() if not newSteps? and not newDistances?

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

        console.log "Found #{stepsToSave.length} new steps measures to save!"
        saveInstance = (model, cb) ->
            model.save cb
        async.forEach stepsToSave, saveInstance, (err) ->
            return callback err if err?

            console.log 'Steps measures saved.'
            notifContent = null
            if stepsToSave.length
                localizationKey = 'notification withings'
                options = smart_count: stepsToSave.length
                notifContent = localization.t localizationKey, options
            callback null, notifContent

        callback()
        return

    console.log 'Fetching former activity measures...'
    Steps.all (err, stepsMeasures) ->
        return callback err if err
        console.log 'Steps', stepsMeasures
        processData stepsMeasures
