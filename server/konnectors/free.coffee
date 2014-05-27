americano = require 'americano-cozy'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'

File = require '../models/file'

log = require('printit')
    prefix: "Free"
    date: true


# Models

InternetBill = americano.getModel 'InternetBill',
    date: Date
    vendor: String
    amount: Number
    fileId: String

InternetBill.all = (callback) ->
    InternetBill.request 'byDate', callback

# Konnector

module.exports =

    name: "Free"
    slug: "free"
    description: "Download all your internet bills from Free."
    vendorLink: "https://www.free.fr/"

    fields:
        login: "text"
        password: "password"
        folderPath: "text"
    models:
        internetbill: InternetBill
    modelNames: ["InternetBill"]

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        InternetBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        data =
            "pass": requiredFields.password
            "login": requiredFields.login

        loginUrl = "https://subscribe.free.fr/login/login.pl"
        billUrl = "https://adsl.free.fr/liste-factures.pl"

        options =
            method: 'POST'
            form: data
            jar: true
            url: loginUrl

        request options, (err, res, body) ->
            buildUrl = ->
                location = res.headers.location
                parameters = location.split('?')[1]
                "#{billUrl}?#{parameters}"

            request.get buildUrl(), (err, res, body) ->
                $ = cheerio.load body
                billInfos = []

                # Parse the fetched page to extract useful data.
                $('.pane li').each ->
                    amount = $($(this).find('strong').get(1)).html()
                    amount = amount.replace ' Euros', ''
                    amount = parseFloat amount

                    pdfUrl = $(this).find('.last a').attr 'href'
                    pdfUrl = "https://adsl.free.fr/#{pdfUrl}"

                    month = pdfUrl.split('&')[2].split('=')[1]
                    date = moment month, 'YYYYMM'

                    billInfo =
                        amount: amount
                        date: date
                        vendor: 'Free'

                    billInfo.pdfurl = pdfUrl if date.year() > 2011
                    billInfos.push billInfo

                saveBills billInfos, requiredFields.folderPath, callback



saveBills = (billInfos, path, callback) ->

    # Get current bills
    InternetBill.all (err, bills) ->
        billHash = {}
        billHash[bill.date.toISOString()] = bill for bill in bills

        # Create only non existing bills.
        billsToCreate = billInfos.filter (bill) ->
            not billHash[bill.date.toISOString()]?

        # Recursive function to save bill PDFs and create bill docs one by one.
        (createBill = ->

            # End of recursive loop when there is no more bill to create.
            if billsToCreate.length is 0
                log.info 'Free bills imported.'
                callback()

            else
                bill = billsToCreate.pop()
                billLabel = bill.date.format 'MMYYYY'

                log.info "import for bill #{billLabel} started."
                if bill.pdfurl?
                    # It creates a file for the PDF.
                    fileName = "#{bill.date.format 'YYYYMM'}_free.pdf"
                    File.createNew fileName, path, bill.date, bill.pdfurl, (err) ->
                        if err
                            log.raw err
                            log.info "bill for #{billLabel} not saved."
                            createBill()
                        else
                            log.info "File for #{billLabel} created."

                            # Then, it creates a bill document.
                            InternetBill.create bill, (err) ->
                                if err
                                    log.raw err
                                    log.error "bill for #{billLabel} not saved."
                                else
                                    log.info "bill for #{billLabel} saved."
                                createBill()
                else
                    # If there is no file, it saves only data.
                    log.info "No file to download for #{billLabel}."
                    InternetBill.create bill, (err) ->
                        if err
                            log.raw err
                            log.error "bill for #{billLabel} not saved."
                        else
                            log.info "bill for #{billLabel} saved."
                        createBill()
        )()
