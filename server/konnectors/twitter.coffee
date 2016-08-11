cozydb = require 'cozydb'
querystring = require 'querystring'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
async = require 'async'
log = require('printit')
    prefix: "Twitter"
    date: true

localization = require '../lib/localization_manager'

# Models

TwitterTweet = cozydb.getModel 'TwitterTweet',
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
    description: 'konnector description twitter'
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
    client = requestJson.createClient url
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

    TwitterTweet.request 'byDate', params, (err, tweets) ->
        if tweets? and tweets.length > 0
            start = moment(new Date tweets[0].date)
        else
            start = moment().subtract(10, 'year')

        log.info "Start import since #{start.format()}"

        saveTweetGroup client, path, start, tweets.length, (err, numItems) ->

            if err then callback err
            else
                log.info "Import finished"

                notifContent = null
                if numItems > 0
                    localizationKey = 'notification tweets'
                    options = smart_count: numItems
                    notifContent = localization.t localizationKey, options

                callback null, notifContent

saveTweetGroup = (client, path, start, tweetLength, callback) ->

    client.get path, (err, res, tweets) ->
        log.debug "#{tweetLength} tweet in DB, #{tweets.length} in the response"
        if err
            callback err
        else if res.statusCode isnt 200
            log.error 'Authentication error'
            callback 'bad credentials'
        else if tweetLength is tweets.length
            log.info 'No new tweet to import'
            callback null, 0
        else
            log.info "#{tweets.length} tweet(s) fetched."
            tweets = tweets.reverse()
            tweets.pop() if path.indexOf('max_id') isnt -1

            numItems = 0
            async.eachSeries tweets, (tweet, cb) ->
                date = moment new Date tweet.created_at
                log.debug date

                if date > start

                    twitterTweet =
                        date: date
                        text: tweet.text
                        id_str: tweet.id_str
                        retweetCount: tweet.retweet_count
                        favoriteCount: tweet.favorite_count
                        isReplyTo: tweet.in_reply_to_status_id?
                        isRetweet: tweet.retweeted_status?

                    numItems++
                    TwitterTweet.create twitterTweet, (err) ->
                        if err
                            cb err
                        else
                            log.debug 'tweet saved ' + date

                            cb()
                else
                    cb()
            , (err) ->
                log.info "#{numItems} tweets imported"
                callback err, numItems
