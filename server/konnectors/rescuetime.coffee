cozydb = require 'cozydb'
querystring = require 'querystring'
request = require 'request-json'
moment = require 'moment'
async = require 'async'

localization = require '../lib/localization_manager'

log = require('printit')
    date: true
    prefix: 'rescuetime'

# Models

RescueTimeActivity = cozydb.getModel 'RescueTimeActivity',
    date: Date
    duration: Number
    description: String
    category: String
    productivity: Number
    people: Number

RescueTimeActivity.all = (callback) ->
    RescueTimeActivity.request 'byDate', callback

RescueTimeActivity.destroyAll = (callback) ->
    RescueTimeActivity.requestDestroy 'byDate', callback

# Konnector

module.exports =

    name: "Rescue Time"
    slug: "rescuetime"
    description: 'konnector description rescuetime'
    vendorLink: "https://www.rescuetime.com/"

    fields:
        apikey: "text"
    models:
        activities: RescueTimeActivity


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        RescueTimeActivity.defineRequest 'byDate', map, (err) ->
            callback err


    # Get last imported activity to know from where to start the import. Then
    # define parameters (start date and end date) and fetch data accordingly.
    fetch: (requiredFields, callback) ->
        params = limit: 1, descending: true
        RescueTimeActivity.request 'byDate', params, (err, activities) =>
            if err then callback err
            else @loadActivities activities, requiredFields, callback


    # Depending
    loadActivities: (activities, requiredFields, callback) ->
        apikey = requiredFields.apikey
        end = moment().add(1, 'days').format 'YYYY-MM-DD'

        if activities.length > 0
            start = moment(activities[0].date).format 'YYYY-MM-DD'
            params = key: new Date(moment().format 'YYYY-MM-DD')
            RescueTimeActivity.requestDestroy 'byDate', params, (err) =>
                if err then callback err
                else @fetchData apikey, start, end, callback

        else
            start = moment().subtract(10, 'years').format 'YYYY-MM-DD'
            @fetchData apikey, start, end, callback


    # Fetch activity list from rescuetime, then create an entry for each row.
    fetchData: (apikey, start, end, callback) ->
        client = request.createClient 'https://www.rescuetime.com/'
        path = 'anapi/data?'
        path += querystring.stringify
            key: apikey
            format: "json"
            perspective: 'interval'
            resolution_time: 'day'
            restrict_begin: start
            restrict_end: end

        client.get path, (err, res, body) ->
            if err
                callback err
            else if res.statusCode isnt 200
                callback new Error body
            else if body.error?
                log.error body.error
                callback body.messages
            else if not body.rows?
                callback new Error """
Something went wrong while fetching rescue time data.
"""
            else
                async.eachSeries body.rows, (row, cb) ->
                    data =
                        date: row[0]
                        duration: row[1]
                        people: row[2]
                        description: row[3]
                        category: row[4]
                        productivity: row[5]
                    RescueTimeActivity.create data, (err) ->
                        log.debug 'new activity imported'
                        log.debug JSON.stringify data

                        cb err
                , (err) ->

                    notifContent = null
                    if body.rows?.length > 0
                        localizationKey = 'notification rescuetime'
                        options = smart_count: body.rows.length
                        notifContent = localization.t localizationKey, options

                    callback err, notifContent
