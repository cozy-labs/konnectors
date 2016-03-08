
# Simple library to build right names depending on parameters
module.exports =


    # Return a file name for a given and a given set of parameters (options).
    # Use mainly for bill naming.
    #
    #
    # Exemple of expected parameters and output:
    #
    # entry =
    #     date: today
    #     orderId: '123456'
    #     travel: 'paris_lyon'
    #
    # options =
    #     vendor: 'telecom'
    #     dateFormat: 'YYYYMMDD'
    #     extension: 'txt'
    #     others: ['orderId', 'travel']
    #
    # naming.getEntryFileName  will return:
    #
    #     "YYYYMMDD_telecom_123456_paris_lyon.txt"
    #
    getEntryFileName: (entry, options) ->
        name = ""
        # We reset the date modified in save_data_and_file
        if entry.date?
            entry.date = new Date(entry.date)
        if typeof(options) is "string"
            name = "#{entry.date.format 'YYYYMM'}_#{options}.pdf"

        else

            # Build date prefix.
            if entry.date?
                if options.dateFormat?
                    name = entry.date.format options.dateFormat
                else
                    name = entry.date.format 'YYYYMM'

            # Add vendor name.
            name += "_#{options.vendor}"

            # Add optional information.
            if options.others?
                for parameter in options.others
                    name += "_#{entry[parameter]}" if entry[parameter]?

            # Add extension.
            extension = options.extension or 'pdf'
            name = "#{name}.#{extension}"

        return name

