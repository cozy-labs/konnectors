module.exports = class KonnectorModel extends Backbone.Model
    rootUrl: "konnectors/"
    url: ->
        "konnectors/#{@get 'id'}"


    # Returns true if the user has fully configured the konnector (it checks if
    # every fields are filled).
    isConfigured: ->
        accounts = @get('accounts') or [{}]
        fieldValues = accounts[0] or {}
        fields = @get 'fields'

        # Remove fields where no value is expected.

        # Check if there is an empty field
        numFieldValues = Object.keys(fieldValues).length
        numFields = Object.keys(fields).length

        numFieldValues-- if fieldValues.loginUrl
        numFields-- if fields.loginUrl

        noEmptyValue = true
        for field, fieldValue of fields
            if field isnt 'loginUrl'
                noEmptyValue = noEmptyValue and fieldValues[field]?.length > 0

        return numFieldValues >= numFields and noEmptyValue

