americano = require 'cozydb'


fixOnboardedSteps = (user) ->
    user.onboardedSteps = user.onboardedSteps or []
    # It seems that there is a bug, string Arrays are fetched like following:
    # [['text']] instead of ['text']
    # So until it's fixed, we prevent this issue by mapping the desired values
    # it the first array object is an array.
    if Array.isArray user.onboardedSteps[0]
        user.onboardedSteps = user.onboardedSteps[0]

    return user


module.exports = User = americano.getModel 'User',
    onboardedSteps: Array


User.first = (callback) ->
    User.request 'all', (err, users) ->
        if err then callback err
        else if not users or users.length is 0 then callback null, undefined
        else
            user = fixOnboardedSteps users[0]
            callback null, user
