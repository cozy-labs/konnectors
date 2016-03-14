module.exports = class KonnectorModel extends Backbone.Model
    rootUrl: "konnectors/"
    url: ->
        "konnectors/#{@get 'id'}"


    # Returns true if the user has fully configured the konnector (it checks if
    # every fields are filled).
    isConfigured: ->
        fieldValues = @get('fieldValues') or {}
        fields = @get 'fields'

        # Remove fields where no value is expected.
        delete fieldValues.loginUrl
        delete fields.loginUrl

        # Check if there is an empty field
        numFieldValues = Object.keys(fieldValues).length
        numFields = Object.keys(fields).length
        noEmptyValue = true
        for field, fieldValue of fields
            noEmptyValue = noEmptyValue and fieldValues[field]?.length > 0

        return numFieldValues >= numFields and noEmptyValue
