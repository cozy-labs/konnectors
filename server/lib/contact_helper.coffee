CH = {}

# With this Model :
# - fn: String # vCard FullName = display name
#   (Prefix Given Middle Familly Suffix)
# - n: [String] # vCard Name = splitted
#   [Familly, Given, Middle, Prefix, Suffix]
CH.nToFN = (n) ->
    n = n or []

    [familly, given, middle, prefix, suffix] = n

    # order parts of name.
    parts = [prefix, given, middle, familly, suffix]
    # remove empty parts
    parts = parts.filter (part) -> part? and part isnt ''

    return parts.join ' '


# Put fn as n's firstname.
CH.fnToN = (fn) ->
    fn = fn or ''

    return ['', fn, '', '', '']


# Parse n field from fn, trying to fill in firstname, lastname and middlename.
CH.fnToNLastnameNFirstname = (fn) ->
    fn = fn or ''

    [given, middle..., familly] = fn.split ' '
    parts = [familly, given, middle.join(' '), '', '']

    return parts

structuredToFlat = (t) ->
    t = t.filter (part) -> return part? and part isnt ''
    return t.join ', '

# Convert splitted vCard address format, to flat one, but with line breaks.
# @param value expect an array (adr value, splitted by ';').
CH.adrArrayToString = (value) ->
    # UX is partly broken on iOS with adr on more than 2 lines.
    # So, we convert structured address to 2 lines flat address,
    # First: Postbox, appartment and street adress on first (field: 0, 1, 2)
    # Second: Locality, region, postcode, country (field: 3, 4, 5, 6)
    value = value or []

    streetPart = structuredToFlat value[0..2]
    countryPart = structuredToFlat value[3..6]

    flat = streetPart
    flat += '\n' + countryPart if countryPart isnt ''
    return flat

CH.adrCompleteStreet = (value) ->
    value = value or []
    return structuredToFlat value[0..2]

# Convert String (of an address) to a [String][7]
CH.adrStringToArray = (s) ->
    s = s or ''
    return ['', '', s, '', '', '', '']



if module?.exports
    module.exports = CH
else
    window.ContactHelper = CH
