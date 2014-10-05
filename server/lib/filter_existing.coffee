
module.exports = (log, model, suffix) ->
    (requiredFields, entries, body, next) ->
        entries.filtered = []

        console.log entries
        # Get current entries
        model.all (err, entryObjects) ->
            return next err if err
            entryHash = {}
            for entry in entryObjects
                entryHash[entry.date.toISOString()] = entry
            # Keep only non already existing entries.
            entries.filtered = entries.fetched.filter (entry) ->
                not entryHash[entry.date.toISOString()]?
            next()
