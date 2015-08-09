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

        # For each entry...
        async.eachSeries entriesToSave, (entry, callback) ->
            entryLabel = entry.date.format 'MMYYYY'
            fileName = naming.getEntryFileName entry, options

            createFileAndSaveData = (entry, entryLabel) ->
                date = entry.date
                pdfurl = entry.pdfurl
                path = requiredFields.folderPath
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
            next()

