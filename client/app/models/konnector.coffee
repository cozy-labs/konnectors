module.exports = class KonnectorModel extends Backbone.Model
    rootUrl: "konnectors/"
    url: ->
        "konnectors/#{@get 'id'}"

    # returns true if the user has configured the konnector
    isConfigured: ->
        fieldValues = @get('fieldValues') or {}
        fields = @get 'fields'
        numFieldValues = Object.keys(fieldValues).length
        numFields = Object.keys(fields).length

        noEmptyValue = true
        for field, fieldValue of fields
            noEmptyValue = noEmptyValue and fieldValues[field]?.length > 0

        return numFieldValues >= numFields and noEmptyValue
