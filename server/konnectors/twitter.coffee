americano = require 'americano-cozy'
querystring = require 'querystring'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
log = require('printit')
    prefix: "Twitter"
    date: true


# Models

TwitterTweet = americano.getModel 'TwitterTweet',
    date: Date
    id_str: String
    text: String
    retweetCount: Number
    favoriteCount: Number
    isReplyTo: Boolean
    isRetweet: Boolean

TwitterTweet.all = (callback) ->
    TwitterTweet.request 'byDate', callback


# Konnector

module.exports =

    name: "Twitter"
    slug: "twitter"
    description: "Download all your tweets published on Twitter."
    vendorLink: "https://twitter.com/"

    fields:
        consumerKey: "text"
        consumerSecret: "password"
        accessToken: "text"
        accessTokenSecret: "password"
    models:
        tweets: TwitterTweet
    modelNames: ["TwitterTweet"]


    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        TwitterTweet.defineRequest 'byDate', map, (err) ->
            callback err


    fetch: (requiredFields, callback) ->
        log.info "Import started"
        params = limit: 1, descending: true
        TwitterTweet.request 'byDate', params, (err, tweets) =>
            if tweets.length > 0
                start = moment(tweets[0].date)
            else
                start = moment().subtract('years', 10)

            log.info "Start import since #{start.format()}"
            saveTweets requiredFields, start, callback


saveTweets = (requiredFields, start, callback) ->
    url = "https://api.twitter.com/1.1/"
    client = requestJson.newClient url
    client.options =
        oauth:
            consumer_key: requiredFields["consumerKey"]
            consumer_secret: requiredFields["consumerSecret"]
            token: requiredFields["accessToken"]
            token_secret: requiredFields["accessTokenSecret"]

    rootPath = "statuses/user_timeline.json?"
    path = rootPath + querystring.stringify
        trim_user: true
        exclude_replies: true
        contributor_details: false
        count: 200

    recSave = (lastId) ->

        if lastId?
            if lastId isnt 'id'
                newPath = path + "&" + querystring.stringify
                    max_id: lastId
            else
                newPath = path

            saveTweetGroup client, newPath, start, (err, lastId) ->
                if err then callback err
                else recSave lastId
        else
            log.info "Import finished"

            callback()

    recSave 'id'


saveTweetGroup = (client, path, start, callback) ->

    client.get path, (err, res, tweets) ->
        if err
            callback err
        else if res.statusCode isnt 200
            callback new Error 'Bad authentication data'
        else
            log.info "#{tweets.length} tweets to import"
            tweets = tweets.reverse()
            tweets.pop() if path.indexOf('max_id') isnt -1

            lastId = null
            recSave = ->
                if tweets?.length > 0
                    tweet = tweets.pop()
                    date = moment tweet.created_at

                    if date > start
                        lastId = tweet.id_str if tweets.length is 0

                        twitterTweet = TwitterTweet
                            date: date
                            text: tweet.text
                            id_str: tweet.id_str
                            retweetCount: tweet.retweet_count
                            favoriteCount: tweet.favorite_count
                            isReplyTo: tweet.in_reply_to_status_id?
                            isRetweet: tweet.retweeted_status?

                        twitterTweet.save (err) ->
                            if err
                                callback err
                            else
                                log.debug 'tweet saved'
                                log.debug twitterTweet
                                recSave()
                    else
                        callback null, null
                else
                    callback null, lastId
            recSave()
