americano = require 'americano-cozy'
querystring = require 'querystring'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
async = require 'async'
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
        saveTweets requiredFields, callback


saveTweets = (requiredFields, callback) ->
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

    params = descending: true

    TwitterTweet.request 'byDate', params, (err, tweets) =>
        if tweets.length? and tweets.length > 0
            start = moment(tweets[0].date)
        else
            start = moment().subtract('years', 10)

        log.info "Start import since #{start.format()}"

        saveTweetGroup client, path, start, tweets.length, (err, lastId) ->
            if err then callback err
            else
                log.info "Import finished"

            callback()


saveTweetGroup = (client, path, start, tweetLength, callback) ->

    client.get path, (err, res, tweets) ->
        log.debug "#{tweetLength} tweet in DB, #{tweets.length} in the response"
        if err
            callback err
        else if res.statusCode isnt 200
            callback new Error 'Bad authentication data'
        else if tweetLength is tweets.length
            log.info 'No new tweet to import'
            callback()
        else
            log.info "#{tweets.length - tweetLength} tweet(s) to import"
            tweets = tweets.reverse()
            tweets.pop() if path.indexOf('max_id') isnt -1

            lastId = null
            async.eachSeries tweets, (tweet, cb) ->

                date = moment tweet.created_at
                log.debug date

                lastId = tweet.id_str
                if date > start

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
                            cb err
                        else
                            log.debug 'tweet saved ' + date
                            cb()
                else
                    cb()
            , (err) ->
                callback err, lastId
