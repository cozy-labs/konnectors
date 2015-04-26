americano = require 'americano-cozy'
request = require 'request'
moment = require 'moment'
crypto = require 'crypto'
async = require 'async'
xml2js = require 'xml2js'

localization = require '../lib/localization_manager'

# Helpers

log = require('printit')
    prefix: 'forex'
    date: true

# Supported ISO 4217 currency codes

CURRENCIES = [
    'USD', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'BGN', 'BRL', 'CNY', 'CZK', 'DKK',
    'HKD', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD',
    'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'
]

# URLs

dailyUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
recentUrl = 'http://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml'
histUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml'

# Other urls
# http://www.global-view.com/forex-trading-tools/forex-history/index.html
# http://www.global-view.com/forex-trading-tools/forex-history/exchange_csv_report.html?CLOSE_1=ON&start_date=1/1/1900&stop_date=03/06/2015&Submit=Get%20Daily%20Stats
# http://www.global-view.com/forex-trading-tools/forex-history/exchange_csv_report.html?CLOSE_1=ON&CLOSE_2=ON&CLOSE_4=ON&start_date=1/1/1900&stop_date=03/06/2015&Submit=Get%20Daily%20Stats
# http://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&series=a6a0113179fdeb9c6fbcdc18575ec09c&lastObs=&from=01/01/2000&to=03/07/2015&filetype=csv&label=omit&layout=seriescolumn

# Models

CurrencyRate = americano.getModel 'CurrencyRate',
    date: Date
    rates: (x) -> x
    base: String

CurrencyRate.all = (callback) ->
    CurrencyRate.request 'byDate', callback

# Konnector

# Build fields: We want one checkbox for each supported currency.
fields = {}
fields[currency] = 'checkbox' for currency in CURRENCIES

module.exports =

    name: 'Forex'
    slug: 'forex'
    description: 'konnector description forex'
    vendorLink: 'https://www.ecb.europa.eu/'

    fields: fields

    models:
        currencyrate: CurrencyRate

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        CurrencyRate.defineRequest 'byDate', map, callback

    # Fetch rates data from the ECB website and save them as Cozy objects.
    fetch: (requiredFields, callback) ->
        log.info 'import started'

        # TODO Compute the latest recent rates (max 90 days old) that we know.
        latestRates = {}

        yesterday = moment().subtract('days', 1).format('YYYY-MM-DD')

        # Figure out how far back in time we need to fetch.
        url = dailyUrl

        for currency in CURRENCIES
            # Do we care about this currency?
            continue if not requiredFields[currency]
            date = latestRates[currency]?.date
            if not date
                # No known recent rate, refetch all the history.
                url = histUrl
                break
            if moment(date) < moment(yesterday)
                # Older rate than yesterday, refetch the last 90 days.
                url = recentUrl

        options =
            method: 'GET'
            url: url

        request options, (err, res, body) ->
            return callback err if err

            xml2js.parseString body, (err, result) ->
                return callback err if err

                days = result['gesmes:Envelope'].Cube[0].Cube
                imported = 0

                for day in days
                    date = moment day.$.time
                    rates = {}
                    for quote in day.Cube
                        currency = quote.$.currency
                        if requiredFields[currency]
                            rates[currency] = parseFloat quote.$.rate
                    # Did we get any new data?
                    continue if not rates
                    currencyrate = new CurrencyRate
                        date: date
                        rates: rates
                        base: 'EUR'
                    currencyrate.save (err) ->
                        if err
                            log.error err
                        else
                            imported++
                            log.debug 'rate imported'
                            log.debug currencyrate

                log.info 'import finished'
                notifContent = null

                if imported > 0
                    localizationKey = 'notification forex'
                    options = smart_count: imported
                    notifContent = localization.t localizationKey, options

                callback err, notifContent
