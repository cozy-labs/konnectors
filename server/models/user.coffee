americano = require 'cozydb'


module.exports = User = americano.getModel 'User',
    onboardedSteps: Array


User.first = (callback) ->
    User.request 'all', (err, users) ->
        if err then callback err
        else if not users or users.length is 0 then callback null, null
        else
            user = users[0]
            callback null, user
