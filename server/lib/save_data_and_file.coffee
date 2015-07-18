async = require 'async'
naming = require './naming'
File = require '../models/file'

module.exports = (log, model, options, tags) ->
    (requiredFields, entries, body, next) ->
        entries.filtered = entries.fetched unless entries.filtered?

        async.eachSeries entries.filtered, (entry, callback) ->
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
                # If there is no file, it saves only data.
                log.info "No file to download for #{entryLabel}."
                saveEntry entry, entryLabel

        , (err) ->
            next()

