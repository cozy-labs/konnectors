async = require "async"
moment = require "moment"
log = require('printit')
    prefix: null
    date: true
importer = require "./importer"

class KonnectorPoller

    start: ->
        @prepareNextCheck()

    prepareNextCheck: ->
        # Every week we check for new data for each konnector
        now = moment()
        nextUpdate = now.clone()
        nextUpdate = now.add 1, 'w'
        format = "DD/MM/YYYY [at] HH:mm:ss"
        msg = "Next import of konnectors on #{nextUpdate.format(format)}"
        log.info msg
        setTimeout @checkAllAccesses.bind(@), nextUpdate - moment()

    checkAllAccesses: ->
        log.info "Checking new entries for all konnectors..."
        importer (err) ->
            if err?
                log.info "An error occurred during fetching -- #{err}"
            log.info "All konnectors fetched."
        @prepareNextCheck()

module.exports = new KonnectorPoller
