americano = require 'cozydb'
log = require('printit')
    prefix: 'konnectors'


# Required to save track fetched via a konnector.
Track = americano.getModel 'Track',
    metas: Object
    ressource: Object
    playlists: [String]
    dateAdded: Date
    plays: Number
    hidden: Boolean


# Create a new track from a file, with a given ID
# trackName: The name we want to give our track
# fileID: File's ID
# callback(err): Callback function
Track.createFromFile = (trackName, fileID, callback) ->
    data =
        metas:
            title: trackName
        ressource:
            type: 'file'
            fileID: fileID
        playlists: []
        dateAdded: new Date()
        plays: 0
        hidden: false
    
    Track.create data, (err, newTrack) ->
        if err
            log.error err
            callback err
        else
            callback null


module.exports = Track