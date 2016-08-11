cozydb = require 'cozydb'
requestJson = require 'request-json'

moment = require 'moment'
cheerio = require 'cheerio'
fs = require 'fs'
async = require 'async'
pngjs = require 'pngjs-image'
request = require 'request'

File = require '../models/file'
fetcher = require '../lib/fetcher'
filterExisting = require '../lib/filter_existing'
saveDataAndFile = require '../lib/save_data_and_file'
linkBankOperation = require '../lib/link_bank_operation'
localization = require '../lib/localization_manager'

log = require('printit')
    prefix: "Free Mobile"
    date: true


# Useragent is required

# coffeelint: disable=max_line_length
request = request.defaults
    headers:
        "User-Agent": "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0"
# coffeelint: enable=max_line_length

# Models

PhoneBill = cozydb.getModel 'PhoneBill',
    date: Date
    vendor: String
    amount: Number
    fileId: String
    pdfurl: String
    binaryId: String
    type: String

PhoneBill.all = (callback) ->
    PhoneBill.request 'byDate', callback


# Konnector

module.exports =

    name: "Free Mobile"
    slug: "freemobile"
    description: 'konnector description free mobile'
    vendorLink: "https://mobile.free.fr/"

    fields:
        login: "text"
        password: "password"
        folderPath: "folder"
    models:
        phonebill: PhoneBill

    # Define model requests.
    init: (callback) ->
        map = (doc) -> emit doc.date, doc
        PhoneBill.defineRequest 'byDate', map, (err) ->
            callback err

    fetch: (requiredFields, callback) ->

        log.info "Import started"

        fetcher.new()
            .use(prepareLogIn)
            .use(getImageAndIdentifyNumbers)
            .use(logIn)
            .use(getBillPage)
            .use(parseBillPage)
            .use(filterExisting log, PhoneBill)
            .use(saveDataAndFile log, PhoneBill, {
                vendor: 'freemobile',
                others: ['phonenumber']
            }, ['facture'])
            .use(linkBankOperation
                log: log
                model: PhoneBill
                identifier: 'free mobile'
                dateDelta: 14
                amountDelta: 0.1
            )
            .use(logOut)
            .args(requiredFields, {}, {})
            .fetch (err, fields, entries) ->
                log.info "Import finished"

                notifContent = null
                if entries?.filtered?.length > 0
                    localizationKey = 'notification bills'
                    options = smart_count: entries.filtered.length
                    notifContent = localization.t localizationKey, options

                callback err, notifContent


#Disconnection of Free Mobile website
logOut =  (requiredFields, billInfos, data, next) ->
    logOutUrl = "https://mobile.free.fr/moncompte/index.php?logout=user"
    options =
        method: 'GET'
        url:  logOutUrl
        jar: true
    request options, (err, res, body) ->
        if err?
            log.error "Couldn't logout of Free Mobile website"
            next err
        next()


# Procedure to prepare the login to Free mobile website.
prepareLogIn = (requiredFields, billInfos, data, next) ->

    homeUrl = "https://mobile.free.fr/moncompte/index.php?page=home"
    #First we need to get the connection page
    options =
        method: 'GET'
        jar: true
        url: homeUrl

    request options, (err, res, body) ->
        if err?
            log.error "Cannot connect to Free Mobile : #{homeUrl}"
            next err
        loginPageData = body
        data.imageUrlAndPosition = []
        $ = cheerio.load loginPageData
        data.token = $('input[name=token]').val()
        $('img[class="ident_chiffre_img pointer"]').each ->
            imagePath = $(this).attr 'src'
            position = $(this).attr 'alt'
            position = position.replace 'position ', ''
            data.imageUrlAndPosition.push
                imagePath : imagePath
                position : position
        next()


getImageAndIdentifyNumbers = (requiredFields, billInfos, data, next) ->
    #For each "position", we download the image, and identify it.
    urlAndPosition = data.imageUrlAndPosition
    async.map urlAndPosition, getImageAndIdentifyNumber, (err, results) ->
        if err?
            log.error "Coud not get or decode image"
            next err
        data.conversionTable = results
        next()


logIn = (requiredFields, billInfos, data, next) ->
    homeUrl = "https://mobile.free.fr/moncompte/index.php?page=home"
    baseUrl = "https://mobile.free.fr/moncompte/"

    # We transcode the login entered by the user into the login accepted by the
    # website. Each number is changed into its position
    transcodedLogin = transcodeLogin requiredFields.login, data.conversionTable
    # The login is unified (each repetition of a number in the login is
    # deleted) to download only once the small image (like a real browser would
    # do)
    uniqueLogin = unifyLogin transcodedLogin

    # Each small image is downloaded. The small image is the image downloaded
    # when the user clicks on the image keyboard
    async.eachSeries uniqueLogin, getSmallImage, (err) ->
        if err?
            next err
        #As trancodedLogin is an array, it is changed into a string
        login =""
        for i in transcodedLogin
            login += i

        form =
            token: data.token
            login_abo: login
            pwd_abo: requiredFields.password


        options =
            method: 'POST'
            form: form
            jar: true
            url: homeUrl
            headers :
                referer : homeUrl

        # We login to Free Mobile
        request options, (err, res, body) ->
            if err? or not res.headers.location? or res.statusCode isnt 302
                log.error "Authentification error"
                log.error err if err?
                log.error "No location" if not res.headers.location?
                log.error "No 302" if res.statusCode isnt 302
                log.error "No password" if not requiredFields.password?
                log.error "No login" if not requiredFields.login?
                next 'bad credentials'

            options =
                method: 'GET'
                jar: true
                url : baseUrl + res.headers.location
                headers :
                    referer : homeUrl
            request options, (err, res, body) ->
                if err?
                    next err
		# We check that there is no connection form (the statusCode is
                # always 302 even if the credential are wrong)
                $ = cheerio.load body
                connectionForm = $('#form_connect')
                if connectionForm.length isnt 0
                    log.error "Authentification error"
                    next 'bad credentials'
                next()


getBillPage = (requiredFields, billInfos, data, next) ->
    billUrl = "https://mobile.free.fr/moncompte/index.php?page=suiviconso"
    options =
        method: 'GET'
        url:  billUrl
        jar: true
    request options, (err, res, body) ->
        if err?
            next err
        data.html = body
        next()


# Parse the fetched page to extract bill data.
parseBillPage = (requiredFields, bills, data, next) ->
    bills.fetched = []
    billUrl = "https://mobile.free.fr/moncompte/index.php?page=suiviconso&\
action=getFacture&format=dl&l="

    return next() if not data.html?
    $ = cheerio.load data.html
    #We check if the account has several lines
    #If the account has one line :
    # - Import pdfs for the line with file name = YYYYMM_freemobile.pdf
    #If multi line :
    # - Import pdfs (specific) for each line with file name =
    # YYYYMM_freemobile_NNNNNNNNNN.pdf (NN..NN is line number)
    # - Import overall pdf with name YYYYMM_freemobile.pdf

    isMultiline = $('div[class="consommation"]').length > 1
    $('div.factLigne.is-hidden').each ->
        amount = $($(this).find('.montant')).text()
        amount = amount.replace '€', ''
        amount = parseFloat amount
        data_fact_id = $(this).attr 'data-fact_id'
        data_fact_login = $(this).attr 'data-fact_login'
        data_fact_date = $(this).attr 'data-fact_date'
        data_fact_multi = parseFloat $(this).attr 'data-fact_multi'
        data_fact_ligne = $(this).attr 'data-fact_ligne'
        pdfUrl = billUrl + data_fact_login + "&id=" + data_fact_id + "&\
date=" + data_fact_date + "&multi=" + data_fact_multi
        date = moment data_fact_date, 'YYYYMMDD'
        bill =
            amount: amount
            date: date
            vendor: 'Free Mobile'
            type: 'phone'

        if isMultiline and not data_fact_multi
            bill.phonenumber = data_fact_ligne

        bill.pdfurl = pdfUrl if date.year() > 2011

        bills.fetched.push bill
    next()


getImageAndIdentifyNumber = (imageInfo, callback) ->
    baseUrl = "https://mobile.free.fr/moncompte/"
    # We download the sound number imageInfo.position. It is necessary to
    # download all the sounds, like a browser would do
    getSound imageInfo.position, (err) ->
        if err?
            callback err, null
        options =
            method: 'GET'
            jar: true
            url: "#{baseUrl}#{imageInfo.imagePath}"
            encoding : null
        # We dowload the image located at imageInfo.imagePath
        request options, (err, res, body) ->
            if err?
                callback err, null
            pngjs.loadImage body, (err, resultImage) ->
                if resultImage.getWidth() < 24 or resultImage.getHeight() < 28
                    callback 'Wrong image size', null
                stringcheck = ""
                # We go through PNG image, but not on all the pixels, as the
                # numbers are only drawn in one specific area
                for x in [15..22]
                    for y in [12..26]
                        idx = resultImage.getIndex x, y
                        green = resultImage.getGreen idx
                        blue = resultImage.getBlue idx
                        #We check if the pixel is "red enough"
                        if green + blue < 450
                            stringcheck += "1"
                        else
                            stringcheck += "0"
                image =
                    position : "#{imageInfo.position}"
                    numberValue : "#{getNumberValue stringcheck}"
                callback err, image


getSound = (position, callback) ->
    baseUrl = "https://mobile.free.fr/moncompte/"
    options =
        method: 'GET'
        url:  baseUrl+"chiffre.php?getsound=1&pos="+position
        jar: true
        headers :
            referer: baseUrl+"sound/soundmanager2_flash9.swf"
    request options, (err, res, body) ->
        if err?
            callback err
        callback null


getNumberValue = (stringcheck) ->
    # coffeelint: disable=max_line_length
    # symbols contains all the digits [0-9] with 0 = white pixel, 1 = red pixel
    symbols =[
        '001111111111110011111111111111111111111111111110000000000011110000000000011111111111111111011111111111111001111111111110' #0
        '001110000000000001110000000000001110000000000011111111111111111111111111111111111111111111000000000000000000000000000000' #1
        '011110000001111011110000111111111000001111111110000011110011110000111100011111111111000011011111110000011001111000000011' #2
        '011100000011110111100000011111111000110000111110000110000011110001110000011111111111111111011111111111110001110001111100' #3
        '000000011111000000001111111000000111110011000011110000011000111111111111111111111111111111111111111111111000000000011000' #4
        '111111110011110111111110011111111001110000111111001100000011111001100000011111001111111111111001111111111010000111111110' #5
        '001111111111110011111111111111111111111111111110001100000011110001100000011111001111111111111101111111111011100111111110' #6
        '111000000000000111000000000000111000000011111111000011111111111011111111111111111111000000111111000000000111100000000000' #7
        '001110001111110011111111111111111111111111111110000110000011110000110000011111111111111111011111111111111001111001111110' #8
        '001111111000110011111111100111111111111100111110000001100011110000001100011111111111111111011111111111111001111111111110' #9
        ]
    # coffeelint: enable=max_line_length
    distanceMin = stringcheck.length
    idxDistanceMin = 10
    for i in [0..9]
        # There is a perfect match with an element of symbols
        if stringcheck is symbols[i]
            return i

        # As there is no perfect match with an element of symbols, we look for
        # the closest symbol
        else
            distance = 0
            for j in [0..stringcheck.length-1]
                if stringcheck[j] isnt symbols[i][j]
                    distance +=1
            if distance < distanceMin
                idxDistanceMin = i
                distanceMin = distance

    return idxDistanceMin


transcodeLogin = (login, conversionTable) ->
    transcoded = []
    for i in login
        for conversion in conversionTable
            if conversion.numberValue is i
                transcoded.push conversion.position
    return transcoded


unifyLogin = (login) ->
    unique = []
    for digit in login
        initTest = true
        for valeur in unique
            if valeur is digit
                initTest = false
        if initTest
            unique.push digit
    return unique


# Small images are downloaded like a browser woulds do.
getSmallImage = (digit, callback) ->
    baseUrl = "https://mobile.free.fr/moncompte/"
    options =
        method: 'GET'
        jar: true
        url: "#{baseUrl}chiffre.php?pos=#{digit}&small=1"

    request options, (err, res, body) ->
        if err?
            callback err
        #Timer is necessary otherwise the connection is not possible
        setTimeout callback, 600, null
