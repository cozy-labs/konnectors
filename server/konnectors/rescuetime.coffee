americano = require 'americano-cozy'
qs = require 'querystring'
request = require 'request-json'
moment = require 'moment'

# Models

RescueTimeActivity = americano.getModel 'RescueTimeActivity',
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
    fields:
        apikey: ""

    description: "Fetch all rescuetime data"

    models:
        activities: RescueTimeActivity

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit(doc.date, doc)
        RescueTimeActivity.defineRequest 'byDate', map, (err) ->
            callback err

    # Define parameters (start date and end date) then fetch data accordingly.
    fetch: (requiredFields, callback) ->
        RescueTimeActivity.request 'byDate', limit: 1, (err, activities) =>
            if err then callback err

            else
                apikey = requiredFields.apikey
                if activities.length > 0
                    start = moment(activities[0].date).format 'YYYY-MM-DD'
                else
                    start = moment().subtract('years', 10).format 'YYYY-MM-DD'
                end = moment().add('days', 1).format 'YYYY-MM-DD'

                @fetchData apikey, start, end, callback

    # Fetch activity list from rescuetime, then create an entry for each row.
    fetchData: (apikey, start, end, callback) ->
        client = request.newClient 'https://www.rescuetime.com/'
        path = 'anapi/data?'
        path += qs.stringify
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
            else
                recSave = (i) ->
                    if i < body.rows.length
                        row = body.rows[i]
                        data =
                            date: row[0]
                            duration: row[1]
                            people: row[2]
                            activity: row[3]
                            category: row[4]
                            productivity: row[5]
                        RescueTimeActivity.create data, (err) ->
                            if err then callback err
                            else
                                i++
                                recSave i
                    else
                        callback()
                recSave 0
