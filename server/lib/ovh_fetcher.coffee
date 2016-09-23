cozydb = require 'cozydb'

moment = require 'moment'
async = require 'async'
fetcher = require '../lib/fetcher'


class OVHFetcher


    constructor: (ovhApi, slug, logger) ->
        @ovh = require('ovh')(ovhApi)
        @slug = slug
        @logger = logger


    fetchBills: (requiredFields, bills, data, next) =>
        @ovh.consumerKey = requiredFields.token or null
        return @needToConnectFirst(requiredFields, next) if not @ovh.consumerKey

        @ovh.request 'GET', '/me/bill', (err, ovhBills) =>
            if (err == 401 || err == 403)
                return @needToConnectFirst(requiredFields, next)
            else if (err)
                @logger.info err
                return next('bad credentials')

            # Fetch individually each bill and build an array.
            async.map ovhBills, (ovhBill, cb) =>
                @ovh.request('GET', '/me/bill/' + ovhBill, cb)
            , (err, ovhBills) =>
                if err
                    @logger.info err
                    return next('request error')

                bills.fetched = []

                ovhBills.forEach (ovhBill) ->
                    # Build bill object.
                    bill =
                        date: moment ovhBill.date
                        amount: ovhBill.priceWithTax.value
                        pdfurl: ovhBill.pdfUrl
                        vendor: 'OVH'
                        type: 'hosting'

                    bills.fetched.push bill

                @logger.info 'Bill data parsed.'
                next()


    getLoginUrl: (callback) ->
        accessRules =
          'accessRules': [
            { method: 'GET', path: '/me/*' }
          ]

        @logger.info 'Request the login url...'
        @ovh.request 'POST', '/auth/credential', accessRules
        , (err, credential) =>
            if err
                @logger.info err
                return callback 'token not found'

            callback null, credential.validationUrl, credential.consumerKey


    saveUrlAndToken: (url, token, callback) =>
        Konnector = require '../models/konnector'
        Konnector.all (err, konnectors) =>
            if err
                return callback err

            ovhKonnector = (konnectors.filter (konnector) =>
                konnector.slug is @slug)[0]

            accounts = [
                loginUrl: url
                token: token
            ]
            ovhKonnector.updateAttributes {accounts}, callback


    needToConnectFirst: (requiredFields, callback) =>
        @ovh.consumerKey = null
        @getLoginUrl (err, url, token) =>
            if err
                @logger.info err
                return callback 'request error'

            requiredFields.loginUrl = url
            requiredFields.token = token
            @saveUrlAndToken url, token, =>
                @logger.info 'You need to login to your OVH account first.'
                callback('konnector ovh connect first')


module.exports =
    new: (ovhApi, slug, logger) ->
        new OVHFetcher ovhApi, slug, logger
