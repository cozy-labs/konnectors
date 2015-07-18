
module.exports = (log, model, suffix, vendor) ->

    (requiredFields, entries, body, next) ->
        entries.filtered = []

        # Get current entries
        model.all (err, entryObjects) ->
            return next err if err
            entryHash = {}

            # Build an hash where key is the date and valie is the entry
            for entry in entryObjects

                # If a vendor parameter is given, entry should be of given
                # vendor to be added to the hash (useful for bills).
                if vendor?
                    if entry.vendor is vendor
                        entryHash[entry.date.toISOString()] = entry
                    # else do nothing

                # Simply add the entry
                else
                    entryHash[entry.date.toISOString()] = entry

            # Keep only non already existing entries.
            entries.filtered = entries.fetched.filter (entry) ->
                not entryHash[entry.date.toISOString()]?

            next()
