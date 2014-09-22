async = require 'async'
File = require '../models/file'

module.exports = (log, model, suffix, tags) ->
    (requiredFields, password, entries, body, next) ->
        entries.filtered = entries.fetched unless entries.filtered?

        async.eachSeries entries.filtered, (entry, callback) ->
            saveEntry = (entry, entryLabel) ->
                model.create entry, (err) ->
                    if err
                        log.raw err
                        log.error "entry for #{entryLabel} not saved."
                    else
                        log.info "entry for #{entryLabel} saved."
                    callback()

            createFileAndSaveData = (entry, entryLabel) ->
                fileName = "#{entry.date.format 'YYYYMM'}_#{suffix}.pdf"
                date = entry.date
                pdfurl = entry.pdfurl
                path = requiredFields.folderPath
                File.createNew fileName, path, date, pdfurl, tags, (err, file) ->
                    if err
                        log.raw err
                        log.info "entry for #{entryLabel} not saved."
                        callback()
                    else
                        log.info "File for #{entryLabel} created."
                        entry.fileId = file.id
                        saveEntry entry, entryLabel

            entryLabel = entry.date.format 'MMYYYY'

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
