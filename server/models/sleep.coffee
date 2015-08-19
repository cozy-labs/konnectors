cozydb = require 'cozydb'


module.exports = Sleep = cozydb.getModel 'Sleep',
    date: Date
    asleepTime: Number
    awakeDuration: Number
    awakeTime: Number
    awakeningCount: Number
    bedTime: Number
    deepSleepDuration: Number
    lightSleepDuration: Number
    sleepDuration: Number
    sleepQuality: Number
    vendor: type: String


Sleep.all = (callback) ->
    Sleep.request 'byDate', callback

