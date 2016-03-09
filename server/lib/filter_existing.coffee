# Returns a fetcher layer that adds a new array field to the second function
# parameter.
# This array contains all entries that are not already stored in the
# database. To know if an entry has no match in the database, it checks if
# date fields are the same.
#
# It expects a field called "fetched" as field of the second parameter. This
# field contains the entries to filter.
#
module.exports = (log, model, suffix, vendor) ->

    (requiredFields, entries, body, next) ->
        entries.filtered = []

        # Set vendor automatically if not given
        if not vendor? and entries.fetched.length > 0
            vendor = entries.fetched[0].vendor

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
                        hash = "#{entry.date.format 'YYYY-MM-DD'}T00:00:00.000Z"
                        entryHash[hash] = entry


                    # else do nothing

                # Simply add the entry
                else
                    hash = "#{entry.date.format 'YYYY-MM-DD'}T00:00:00.000Z"
                    entryHash[hash] = entry

            # Keep only non already existing entries.
            entries.filtered = entries.fetched.filter (entry) ->
                hash = "#{entry.date.format 'YYYY-MM-DD'}T00:00:00.000Z"
                not entryHash[hash]?

            # Keep only entries matching current vendor.
            entries.filtered = entries.filtered.filter (entry) ->
                entry.vendor is vendor
            next()

