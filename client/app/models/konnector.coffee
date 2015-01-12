module.exports = class KonnectorModel extends Backbone.Model
    rootUrl: "konnectors/"

    # returns true if the user has configured the konnector
    isConfigured: ->
        fieldValues = @get('fieldValues') or {}
        fields = @get 'fields'
        numFieldValues = Object.keys(fieldValues).length
        numFields = Object.keys(fields).length

        noEmptyValue = true
        for field, fieldValue of fieldValues
            noEmptyValue = noEmptyValue and fieldValue.length > 0

        return numFieldValues is numFields and noEmptyValue
