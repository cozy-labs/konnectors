File = require '../models/file'

module.exports = (log, model, suffix, tags) ->
    (requiredFields, entries, body, next) ->
        entries.filtered = entries.fetched unless entries.filtered?

        # Recursive function to save entry PDFs and create entry docs one by
        # one.
        (createEntry = ->

            saveEntry = (entry, entryLabel) ->
                model.create entry, (err) ->
                    if err
                        log.raw err
                        log.error "entry for #{entryLabel} not saved."
                    else
                        log.info "entry for #{entryLabel} saved."
                    createEntry()

            createFileAndSaveData = (entry, entryLabel) ->
                fileName = "#{entry.date.format 'YYYYMM'}_#{suffix}.pdf"
                date = entry.date
                pdfurl = entry.pdfurl
                path = requiredFields.folderPath
                File.createNew fileName, path, date, pdfurl, tags, (err, file) ->
                    if err
                        log.raw err
                        log.info "entry for #{entryLabel} not saved."
                        createEntry()
                    else
                        log.info "File for #{entryLabel} created."
                        entry.fileId = file.id
                        saveEntry entry, entryLabel

            if entries.filtered.length isnt 0
                entry = entries.filtered.pop()
                entryLabel = entry.date.format 'MMYYYY'

                log.info "import for entry #{entryLabel} started."
                if entry.pdfurl?
                    # It creates a file for the PDF.
                    createFileAndSaveData entry, entryLabel
                else
                    # If there is no file, it saves only data.
                    log.info "No file to download for #{entryLabel}."
                    saveEntry entry, entryLabel

            # End of recursive loop when there is no more entry to create.
            else
                next()

        )()
