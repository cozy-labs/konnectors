americano = require 'americano-cozy'
request = require 'request'
moment = require 'moment'
crypto = require 'crypto'
async = require 'async'
xml2js = require 'xml2js'

localization = require '../lib/localization_manager'

# helpers

log = require('printit')
    prefix: 'currencies'
    date: true

# Urls

dailyUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
recentUrl = 'http://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml'
histUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml'

# Other urls
# http://www.global-view.com/forex-trading-tools/forex-history/index.html
# http://www.global-view.com/forex-trading-tools/forex-history/exchange_csv_report.html?CLOSE_1=ON&start_date=1/1/1900&stop_date=03/06/2015&Submit=Get%20Daily%20Stats
# http://www.global-view.com/forex-trading-tools/forex-history/exchange_csv_report.html?CLOSE_1=ON&CLOSE_2=ON&CLOSE_4=ON&start_date=1/1/1900&stop_date=03/06/2015&Submit=Get%20Daily%20Stats
# http://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&series=a6a0113179fdeb9c6fbcdc18575ec09c&lastObs=&from=01/01/2000&to=03/07/2015&filetype=csv&label=omit&layout=seriescolumn

# Models

CurrencyRate = americano.getModel 'CurrencyRate'
    date: Date
    rate: Number
    currency: String
    base: String

CurrencyRate.all = (callback) ->
    CurrencyRate.request 'byDate', callback

# Konnector

module.exports =

    name: "Currencies"
    slug: "currencies"
    description: 'konnector description currencies'
    vendorLink: "https://www.ecb.europa.eu/"

    fields:
        EUR: "checkbox"
        USD: "checkbox"
        JPY: "checkbox"
        BGN: "checkbox"
        CZK: "checkbox"
        DKK: "checkbox"
        GBP: "checkbox"
        HUF: "checkbox"
        PLN: "checkbox"
        RON: "checkbox"
        SEK: "checkbox"
        CHF: "checkbox"
        NOK: "checkbox"
        HRK: "checkbox"
        RUB: "checkbox"
        TRY: "checkbox"
        AUD: "checkbox"
        BRL: "checkbox"
        CAD: "checkbox"
        CNY: "checkbox"
        HKD: "checkbox"
        IDR: "checkbox"
        ILS: "checkbox"
        INR: "checkbox"
        KRW: "checkbox"
        MXN: "checkbox"
        MYR: "checkbox"
        NZD: "checkbox"
        PHP: "checkbox"
        SGD: "checkbox"
        THB: "checkbox"
        ZAR: "checkbox"
    models:
        currencyrate: CurrencyRate

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        CurrencyRate.defineRequest 'byDate', map, (err) ->
            callback err

    # Fetch rates data from the ECB website and save them as Cozy objects.
    fetch: (requiredFields, callback) ->
        log.info 'import started'

        url = dailyUrl
        today = new Date() # FIXME day-precision, not millisecond-precision.

        # Compute the latest rates we know.
        # FIXME maybe this doesn't need to go through all the rates?
        latestRates = {}
        CurrencyRate.all, (err, rates) ->
            return callback err if err
            for rate in rates
                date = latestRates[rate.currency].date
                if !date or date < rate.date
                    latestRates[rate.currency] = rate
        
        # Figure out how far back in time we need to fetch.
        for currency in requiredFields
            if !requiredFields[currency] #.checked ?
                continue
            date = latestRates[currency].date
            if !date or date #older than 90days
                # Jackpot! We have to refetch from the beginning.
                url = histUrl
                break
            if date #older than yesterday
                url = recentUrl

        options =
            method: 'GET'
            url: url

        request options, (err, res, body) ->
            return callback err if err

            result = xml2js.parseString body, (err, result) ->
                if err log.error err

                days = result['gesmes:Envelope'].Cube[0].Cube

                for day of days
                    date = new Date(day.$.time)
                    for quote of day.Cube
                        currency = quote.$.currency
                        rate = quote.$.rate
                        latest = latestRates[currency]
                        if latest and latest >= date
                            continue
                        currencyrate = new CurrencyRate
                            date: date
                            rate: rate
                            currency: currency
                            base: "EUR"
                        currencyrate.save (err) ->
                            if err
                                log.error err
                            else
                                log.debug "rate imported"
                                log.debug currencyrate
                                callback()