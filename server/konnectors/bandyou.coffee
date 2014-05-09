americano = require 'americano-cozy'
requestJson = require 'request-json'
request = require 'request'
moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'

log = require('printit')
    prefix: "B&You"
    date: true


# Models

PhoneBill = americano.getModel 'PhoneBill',
    date: Date
    vendor: String
    amount: Number
    fileId: String

PhoneBill.all = (callback) ->
    PhoneBill.request 'byDate', callback

File = americano.getModel 'File',
    path: String
    name: String
    creationDate: String
    lastModification: String
    class: String
    size: Number
    binary: Object
    modificationHistory: Object
    clearance: (x) -> x
    tags: (x) -> x

# Konnector

module.exports =

    name: "B&You"
    slug: "bandyou"
    description: "Download all your bills from B&You."
    vendorLink: "https://www.b-and-you.fr/"

    fields:
        phoneNumber: "text"
        password: "password"
        folderPath: "text"
    models:
        phonebill: PhoneBill
    modelNames: ["PhoneBill"]

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        PhoneBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        data =
            "login[password]": requiredFields.password
            "login[username]": requiredFields.phoneNumber

        loginUrl = 'https://www.b-and-you.fr/customer/account/loginPostAjax'
        billUrl = 'https://www.b-and-you.fr/user/bill/'

        options =
            method: 'POST'
            form: data
            jar: true

        # Log to the B&You website.
        options.uri = loginUrl
        request options, (err, res, body) ->

            # Fecth the bill URL.
            options.method = 'GET'
            options.uri = billUrl
            request options, (err, res, body) ->

                # Get bill lines from the HTML page.
                $ = cheerio.load body.replace('\\', '')
                billInfos = []
                $('option').each  ->

                    # Parse each line to extract date, amount and PDF URL.
                    pdfurl = $(this).val()
                    text = $(this).text()
                    amount = text.split('-')[1].trim()
                    amount = amount.replace(',', '.')
                    amount = amount.replace(' €', '')
                    amount = parseFloat amount

                    len = pdfurl.length
                    dateString = pdfurl.substring (len - 5), (len - 1)
                    date = moment dateString, 'MM-YY'

                    # Add to the list of bills to Save.
                    billInfos.push
                        pdfurl: pdfurl
                        amount: amount
                        date: date
                        vendor: 'B&You'

                saveBills billInfos, requiredFields.folderPath, callback


createFile = (path, date, url, callback) ->

    now = moment().toISOString()
    fileName = "#{date.format 'YYYYMM'}_bnyou.pdf"
    filePath = "/tmp/#{fileName}"

    data =
        name: fileName
        path: path
        creationDate: now
        lastModification: now
        tags: ["facture"]
        class: 'document'

    # Index file to DS indexer.
    index = (newFile) ->
        newFile.index ["name"], (err) ->
            log.error err if err
            callback()

    # Attach binary to newly created file.
    attachBinary = (newFile) ->
        newFile.attachBinary filePath, "name": "file", (err) ->
            if err
                log.error err
                callback err
            else
                index newFile

    # Save file in a tmp folder while attachBinary supports stream.
    options =
        uri: url
        method: 'GET'
        jar: true
    stream = request options, (err) ->
        if err
            log.error err
            callback err
        else
            # Once done create file metadata then attach binary to file.
            stats = fs.statSync filePath
            data.size = stats["size"]
            File.create data, (err, newFile) =>
                if err
                    log.error err
                    callback err
                else
                    attachBinary newFile


    stream.pipe fs.createWriteStream filePath


saveBills = (billInfos, path, callback) ->

    # Get current bills
    PhoneBill.all (err, bills) ->
        billHash = {}
        billHash[bill.date.toISOString()] = bill for bill in bills

        # Create only non existing bills.
        billsToCreate = billInfos.filter (bill) ->
            not billHash[bill.date.toISOString()]?

        # Recursive function to save bill PDFs and create bill docs one by one.
        createBill = ->

            # End of recursive loop when there is no more bill to create.
            if billsToCreate.length is 0
                log.info 'B&You bills imported.'
                callback()

            # We create a file for the PDF...
            else
                bill = billsToCreate.pop()
                billLabel = bill.date.format 'MMYYYY'
                log.info "import for bill #{billLabel} started."
                createFile path, bill.date, bill.pdfurl, (err) ->
                    if err
                        log.raw err
                        log.info "bill for #{billLabel} not saved."
                        createBill()
                    else
                        log.info "File for #{billLabel} created."
                        # ... Then it creates a bill document.
                        PhoneBill.create bill, (err) ->
                            if err
                                log.raw err
                                log.info "bill for #{billLabel} not saved."
                            else
                                log.info "bill for #{billLabel} saved."
                            createBill()

        createBill()
