requestJson = require 'request-json'
request = require 'request'
querystring = require 'querystring'
log = require('printit')(prefix: 'GAT')

client = requestJson.createClient 'https://www.googleapis.com/oauth2/v3/token'
client.headers['Content-Type'] = 'application/x-www-form-urlencoded'

data =
    client_secret: "1gNUceDM59TjFAks58ftsniZ"
    redirect_uri: "urn:ietf:wg:oauth:2.0:oob"
    grant_type: "authorization_code"
    client_id: """
260645850650-2oeufakc8ddbrn8p4o58emsl7u0r0c8s.apps.googleusercontent.com"""

scopes = [
    'https://www.google.com/m8/feeds'
    'https://www.googleapis.com/auth/userinfo.email'
]

OAuth2 = require('google-auth-library')::OAuth2
oauth2Client = new OAuth2 data.client_id, data.client_secret, data.redirect_uri

module.exports.oauth2Client = oauth2Client

module.exports.getAuthUrl = ->
    oauth2Client.generateAuthUrl scope: scopes

module.exports.generateRequestToken = (authCode, callback)->
    data.code = authCode
    urlEncodedData = querystring.stringify data
    log.debug "requestToken #{authCode}"
    client.post "?#{urlEncodedData}", data, (err, res, body)->
        if not err? and body.error?
            err = body
        return callback err if err

        log.debug "gotToken", body
        callback err, body

module.exports.refreshToken = (refreshToken, callback) ->
    form =
        client_secret: data.client_secret
        client_id: data.client_id
        refresh_token: refreshToken
        grant_type: "refresh_token"

    request
        method: 'POST'
        form: form
        uri: "https://www.googleapis.com/oauth2/v3/token"
        headers: 'Content-Type': 'application/x-www-form-urlencoded'
    , (err, res, body) ->
        return callback err if err
        body = JSON.parse body

        if body.error?
            err = body

        log.debug "got fresh Token", body
        callback err, body

