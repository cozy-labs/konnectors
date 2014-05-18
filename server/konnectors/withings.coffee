americano = require 'americano-cozy'
request = require 'request'
moment = require 'moment'
crypto = require 'crypto'

log = require('printit')
    date: true
    prefix: 'withings'

hexMd5 = (name) ->
    crypto.createHash('md5').update(name).digest('hex')


authUrl = 'https://auth.withings.com/fr/'
accountUrl = 'https://healthmate.withings.com/index/service/account'
measureUrl = 'https://healthmate.withings.com/index/service/measure'

# Models

WithingsScaleMeasure = americano.getModel 'WithingsScaleMeasure',
    date: Date
    weight: Number
    leanWeight: Number
    fatWeight: Number
    user: String

WithingsHeartBeat = americano.getModel 'WithingsHeartBeat',
    date: Date
    value: Number
    user: String

WithingsScaleMeasure.all = (callback) ->
    WithingsScaleMeasure.request 'byDate', callback

WithingsScaleMeasure.destroyAll = (callback) ->
    WithingsScaleMeasure.requestDestroy 'byDate', callback

WithingsHeartBeat.all = (callback) ->
    WithingsHeartBeat.request 'byDate', callback

WithingsHeartBeat.destroyAll = (callback) ->
    WithingsHeartBeat.requestDestroy 'byDate', callback


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
        scalemeasure: WithingsScaleMeasure
        heartbeat: WithingsHeartBeat
    modelNames: ["WithingsScaleMeasure", "WithingsHeartBeat"]


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        WithingsScaleMeasure.defineRequest 'byDate', map, (err) ->
            callback err if err
            WithingsHeartBeat.defineRequest 'byDate', map, (err) ->
                callback err


    # Get last imported activity to know from where to start the import. Then
    # define parameters (start date and end date) and fetch data accordingly.
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


    # Fetch activity list from rescuetime, then create an entry for each row.
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

                sessionid = res.headers['set-cookie'][1].split(';')[0].split('=')[1]

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

                    # Fetch withings measure
                    request.post measureUrl, form: data, (err, res, body) =>
                        return callback err if err
                        measures = JSON.parse body
                        saveMeasures measures.body.measuregrps, callback


saveMeasures = (measures, callback) ->
    scaleMeasureHash = {}
    heartBeatHash = {}

    log.debug 'fetch old measures'
    WithingsScaleMeasure.all (err, scaleMeasures) ->
        return callback err if err
        WithingsHeartBeat.all (err, heartBeats) ->
            return callback err if err

            for scaleMeasure in scaleMeasures
                date = moment scaleMeasure.date
                scaleMeasureHash[date] = true

            for heartBeat in heartBeats
                date = moment heartBeat.date
                heartBeatHash[date] = true

            log.debug 'analyse new measures'
            measuresToSave = []
            heartBeatsToSave = []
            for measuregrp in measures
                date = moment(measuregrp.date * 1000)

                scaleMeasure = new WithingsScaleMeasure
                scaleMeasure.date = date
                heartBeat = new WithingsHeartBeat
                heartBeat.date = date
                for measure in measuregrp.measures
                    # 1 - weight
                    # 5 - lean weight
                    # 8 - fat weight
                    # 11 - heart beat
                    if measure.type is  11
                        heartBeat.value = measure.value
                    else if measure.type is 1
                        scaleMeasure.weight = measure.value
                    else if measure.type is 5
                        scaleMeasure.leanWeight = measure.value
                    else if measure.type is 8
                        scaleMeasure.fatWeight = measure.value

                if scaleMeasure.weight? and not scaleMeasureHash[date]?
                    measuresToSave.push scaleMeasure

                if heartBeat.value? and not heartBeatHash[date]?
                    heartBeatsToSave.push heartBeat

            log.debug "#{measuresToSave.length} weight measures to save"
            log.debug "#{heartBeatsToSave.length} heartbeat measures to save"
            saveMeasures = ->
                if measuresToSave.length is 0
                    log.debug 'Save heartbeats...'
                    saveHeartBeats()
                else
                    measure = measuresToSave.pop()
                    measure.save (err) ->
                        log.error "saving #{measure} failed." if err
                        saveMeasures()

            saveHeartBeats = ->
                if heartBeatsToSave.length is 0
                    log.debug 'Saving is done...'
                    callback()
                else
                    heartBeat = heartBeatsToSave.pop()
                    heartBeat.save (err) ->
                        log.error "saving #{heartBeat} failed." if err
                        saveHeartBeats()

            log.debug 'Save measures...'
            saveMeasures()
