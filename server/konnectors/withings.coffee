americano = require 'americano-cozy'
request = require 'request'
moment = require 'moment'
crypto = require 'crypto'

# helpers

log = require('printit')
    date: true
    prefix: 'withings'

hexMd5 = (name) ->
    crypto.createHash('md5').update(name).digest('hex')

# Urls

authUrl = 'https://auth.withings.com/fr/'
accountUrl = 'https://healthmate.withings.com/index/service/account'
measureUrl = 'https://healthmate.withings.com/index/service/measure'

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

for model in [Weight, BloodPressure, HeartBeat]
    model.all = (callback) ->
        model.request 'byDate', callback

    model.destroyAll = (callback) ->
        model.requestDestroy 'byDate', callback


# Konnector

module.exports =

    name: "Withings"
    slug: "withings"
    description: "Download all your measures from your Withings account."
    vendorLink: "https://www.withings.com/"

    fields:
        email: "text"
        password: "password"
    models:
        scalemeasure: Weight
        heartbeat: HeartBeat
        bloodpressure: BloodPressure


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        Weight.defineRequest 'byDate', map, (err) ->
            callback err if err
            HeartBeat.defineRequest 'byDate', map, (err) ->
                callback err
                BloodPressure.defineRequest 'byDate', map, (err) ->
                    callback err


    # Set start and end date to fetch all data.
    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        log.debug 'fetch withings'

        email = requiredFields.email
        password = requiredFields.password

        end = Math.ceil((new Date).getTime() / 1000)
        start = moment()
        start = start.years 2008
        start = start.month 0
        start = start.date 1
        start = Math.ceil(start.valueOf() / 1000)

        @fetchData email, password, start, end, callback


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

                    # Fetch withings measures
                    request.post measureUrl, form: data, (err, res, body) =>
                        return callback err if err
                        measures = JSON.parse body
                        saveMeasures measures.body.measuregrps, callback


saveMeasures = (measures, callback) ->

    processData = (scaleMeasures, heartBeats, bloodPressures) ->
        scaleMeasureHash = {}
        heartBeatHash = {}
        bloodPressureHash = {}

        for scaleMeasure in scaleMeasures
            date = moment scaleMeasure.date
            scaleMeasureHash[date] = true

        for heartBeat in heartBeats
            date = moment heartBeat.date
            heartBeatHash[date] = true

        for bloodPressure in bloodPressures
            date = moment bloodPressure.date
            bloodPressureHash[date] = true

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

            if bloodPressure.systolic? and not bloodPressure[date]?
                bloodPressuresToSave.push bloodPressure

        log.debug "#{measuresToSave.length} weight measures to save"
        log.debug "#{heartBeatsToSave.length} heartbeat measures to save"
        log.debug "#{bloodPressuresToSave.length} blood pressure measures to save"

        saveAll = (models, done) ->
            if models.length is 0
                done()
            else
                model = models.pop()
                model.save (err) ->
                    if err then done err
                    else saveAll models, done

        log.debug 'Save weights...'
        saveAll measuresToSave, (err) ->
            log.debug 'Heartbeats saved...'
            if err then callback err
            else

                log.debug 'Save heartbeats...'
                saveAll heartBeatsToSave, (err) ->
                    log.debug 'Heartbeats saved...'
                    if err then callback err
                    else

                        log.debug 'Save blood pressures...'
                        saveAll bloodPressuresToSave, (err) ->
                            log.debug 'Blood pressures saved...'
                            if err then callback err
                            else callback()

    log.debug 'fetch old measures'
    Weight.all (err, scaleMeasures) ->
        return callback err if err
        HeartBeat.all (err, heartBeats) ->
            return callback err if err
            BloodPressure.all (err, bloodPressures) ->
                return callback err if err
                processData scaleMeasures, heartBeats, bloodPressures
