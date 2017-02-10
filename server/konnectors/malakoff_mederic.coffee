request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
Bill = require '../models/bill'
baseKonnector = require '../lib/base_konnector'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'

localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Malakoff Mederic"
    date: true

domain = "https://extranet.malakoffmederic.com"

# Procedure to login to Malakoff Mederic website.
logIn = (requiredFields, billInfos, data, next) ->
    options =
        method: 'GET'
        jar: true
        url: "#{domain}/espaceClient/LogonAccess.do"

    # Get the cookie
    request options, (err, res, body) ->
        if err
            return next 'request error'

        # This id is stored in the cookie and used to check the log in
        httpSessionId = res.headers['set-cookie'][0]
        httpSessionId = httpSessionId.split(';')[0]
        httpSessionId = httpSessionId.split('=')[1]

        engineUrl = "https://extranet.malakoffmederic.com/dwr/engine.js"
        genOptions =
            url: engineUrl
            jar: true

        # Request a js page to extract a generated session id: because why not
        request genOptions, (err, res, body) ->
            if err
                return next 'request error'

            regexp = /dwr.engine._origScriptSessionId = "([A-Z0-9]+)"/g
            matches = body.match regexp
            id = matches[0].split('"')[1]
            # The client must generate 3 random digits
            scriptSessionId = id + Math.floor(Math.random() * 1000)

            path = "/dwr/call/plaincall/InternauteValidator.checkConnexion.dwr"
            submitUrl = "#{domain}#{path}"
            checkOption =
                method: 'POST'
                jar: true
                url: submitUrl
                headers:
                    'Content-Type': 'text/plain'
                body:
                    "callCount=1\n\
                    page=/espaceClient/LogonAccess.do\n\
                    httpSessionId=#{httpSessionId}\n\
                    scriptSessionId=#{scriptSessionId}\n\
                    c0-scriptName=InternauteValidator\n\
                    c0-methodName=checkConnexion\n\
                    c0-id=0\n\
                    c0-param0=boolean:false\n\
                    c0-param1=string:#{requiredFields.login}\n\
                    c0-param2=string:#{requiredFields.password}\n\
                    batchId=0\n"

            # Log in
            request checkOption, (err, res, body) ->
                if err
                    log.error err
                    return next 'request error'
                else if res.statusCode >= 400
                    log.error 'Authentication error'
                    return next 'request error'
                # The body should not contain LOGON_KO
                else if body.indexOf('LOGON_KO') > -1
                    log.error 'Authentication error'
                    return next 'bad credentials'

                log.info 'Logged in'

                path = "/espaceClient/sante/tbs/redirectionAction.do"
                reimbursementUrl = "#{domain}#{path}"
                options =
                    method: 'GET'
                    url: reimbursementUrl
                    jar: true

                # Get the reimbursements
                request options, (err, res, body) ->
                    if err
                        log.error err
                        return next 'request error'

                    data.html = body
                    next()


# Parse the fetched page to extract bill data.
parsePage = (requiredFields, healthBills, data, next) ->

    healthBills.fetched = []
    return next() if not data.html?

    $ = cheerio.load data.html

    $('.headerRemboursements').each ->
        amount = $(this).find('.montant').text()
        amount = amount.replace(' €', '').replace(',', '.')
        amount = parseFloat amount

        dateText = $(this).find('.dateEmission').text()
        date = dateText.split('Emis le ')[1].split('aux')[0]

        pdfUrl = $(this).find('#tbsRembExportPdf').attr('href')
        pdfUrl = "#{domain}#{pdfUrl}"

        bill =
            amount: amount
            type: 'health'
            date: moment date, 'DD/MM/YYYY'
            vendor: 'Malakoff Mederic'
            pdfurl: pdfUrl

        healthBills.fetched.push bill if bill.amount?
    next()


buildNotification = (requiredFields, healthBills, data, next) ->
    log.info "Import finished"
    notifContent = null
    if healthBills?.filtered?.length > 0
        localizationKey = 'notification bills'
        options = smart_count: healthBills.filtered.length
        healthBills.notifContent = localization.t localizationKey, options
    next()


fileOptions =
    vendor: 'Malakoffmederic'
    dateFormat: 'YYYYMMDD'


module.exports = baseKonnector.createNew
    name: "Malakoff Mederic"
    vendorLink: "http://www.malakoffmederic.com/index.jsp"

    color:
        hex: '#D4951A'
        css: '#D4951A'

    fields:
        login:
            type: "text"
        password:
            type: "password"
        folderPath:
            type: "folder"
    dataType: ['health', 'bill']
    models: [Bill]

    fetchOperations: [
        logIn,
        parsePage,
        filterExisting(log, Bill),
        saveDataAndFile(log, Bill, fileOptions, ['health', 'bill']),
        linkBankOperation({
          log: log
          model: Bill
          dateDelta: 10
          amountDelta: 0.1
          identifier: 'MALAKOFF MEDERIC'
        }),
        buildNotification
    ]
