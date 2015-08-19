americano = require 'cozydb'
log = require('printit')
    prefix: 'event:model'

module.exports = Event = americano.getModel 'Event',
    start       : type: String
    end         : type: String
    place       : type: String
    details     : type: String
    description : type: String
    rrule       : type: String
    tags        : type: (x) -> x # DAMN IT JUGGLING
    attendees   : type: [Object]
    related     : type: String, default: null
    timezone    : type: String
    alarms      : type: [Object]
    created     : type: String
    lastModification: type: String

require('cozy-ical').decorateEvent Event

Event.all = (params, callback) ->
    Event.request "all", params, callback

Event.byCalendar = (calendarId, callback) ->
    Event.request 'byCalendar', key: calendarId, callback

Event.createOrUpdate = (data, callback) ->
    Event.request 'all', key: data.id, (err, events) ->
        if err?
            log.error err
            Event.create data, callback
        else if events.length is 0
            Event.create data, callback
        else if data.id is events[0].id
            log.debug 'Event already exists, updating...'
            event = events[0]

            # Only update attributes that should not be changed by the user
            if data.start isnt event.start or data.end isnt event.end \
            or data.place isnt event.place \
            or data.description isnt event.description \
            or data.details isnt event.details
                # clone object
                oldValue = event.toJSON() # clone the object properties
                event.updateAttributes
                    start: data.start
                    end: data.end
                    place: data.place
                    description: data.description
                    details: data.details
                , (err) ->
                    event.beforeUpdate = oldValue
                    callback err, event
            else
                callback null, event
        else
            Event.create data, callback

Event.getInRange = (options, callback) ->
    Event.request 'byDate', options, callback
