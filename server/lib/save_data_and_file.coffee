async = require 'async'
naming = require './naming'
File = require '../models/file'



# Fetcher layer that creates an object in database for each entry. If a field
# named pdfurl is is set on the entry, it downloads the file and creates a Cozy
# File in the folder given in the options object.
#
# It expects to find the list of entries in the "filtered" field. If the
# filtered field is null, it checks for the  "fetched" field.
module.exports = (log, model, options, tags) ->

    (requiredFields, entries, body, next) ->

        entriesToSave = entries.filtered or entries.fetched
        path = requiredFields.folderPath

        # For each entry...
        async.eachSeries entriesToSave, (entry, callback) ->
            entryLabel = entry.date.format 'MMYYYY'
            fileName = naming.getEntryFileName entry, options

            createFileAndSaveData = (entry, entryLabel) ->
                date = entry.date
                pdfurl = entry.pdfurl
                File.createNew fileName, path, date, pdfurl, tags, onCreated

            onCreated = (err, file) ->
                if err
                    log.raw err
                    log.info "File for #{entryLabel} not created."
                    callback()
                else
                    log.info "File for #{entryLabel} created: #{fileName}"
                    entry.fileId = file.id
                    entry.binaryId = file.binary.file.id
                    saveEntry entry, entryLabel

            saveEntry = (entry, entryLabel) ->
                if not entry.vendor?
                    entry.vendor = options.vendor if options.vendor

                model.create entry, (err) ->
                    if err
                        log.raw err
                        log.error "entry for #{entryLabel} not saved."
                    else
                        log.info "entry for #{entryLabel} saved."
                    callback()

            log.info "import for entry #{entryLabel} started."
            if entry.pdfurl?
                # It creates a file for the PDF.
                createFileAndSaveData entry, entryLabel

            else
                # If there is no file link set, it saves only data.
                log.info "No file to download for #{entryLabel}."
                saveEntry entry, entryLabel

        , (err) ->

            opts =
                entries: entries.fetched
                folderPath: path
                nameOptions: options
                tags: tags
                model: model
                log: log
            checkForMissingFiles opts, ->
                next()


# For each entry, ensure that the corresponding file exists in the Cozy Files
# application. If it doesn't exist, it creates the file by downloading it
# from its url.
checkForMissingFiles = (options, callback) ->
    {entries, folderPath, nameOptions, tags, model, log} = options


    async.eachSeries entries, (entry, done) ->
        fileName = naming.getEntryFileName entry, nameOptions
        path = "#{folderPath}/#{fileName}"

        # Check if the file is there.
        File.isPresent path, (err, isPresent) ->

            # If it's there, it does nothing.
            if isPresent or not entry.pdfurl?
                done()

            # If it's not there, it creates it.
            else
                date = entry.date
                url = entry.pdfurl
                path = folderPath

                File.createNew fileName, path, date, url, tags, (err, file) ->

                    if err
                        log.error 'An error occured while creating file'
                        log.raw err
                    else

                        # Then update links it from the current model to
                        # the file.
                        date = entry.date.toISOString()
                        model.request 'byDate', key: date, (err, entries) ->
                            if not(entries?) or entries.length is 0
                                done()
                            else
                                entry = entries[0]
                                data =
                                    fileId: file.id
                                    binaryId: file.binary.file.id
                                entry.updateAttributes data, (err) ->
                                    log.info "Missing file created: #{path}"

                                    done()
    , (err) ->
        callback()

