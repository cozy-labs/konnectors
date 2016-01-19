ContactHelper = require '../lib/contact_helper'

linkedin =

    # Extract phone numbers from given linkedin data structure.
    getPhoneNumber: (data) ->
        listPhones = []

        data.phone_numbers?.forEach (number) ->
            listPhones.push
                name: 'tel'
                type: number.type.toLowerCase()
                value: number.number.replace(/ /g, '')
        listPhones


    # Extract emails from given linkedin data structure.
    getEmails: (data) ->
        listEmails = []

        data.emails_extended?.forEach (email) ->
            listEmails.push
                name: 'email'
                value: email.email
                type: 'internet'
                pref: email.primary is true ? true : undefined
        listEmails


    # Extract urls from given linkedin data structure.
    getUrls: (data) ->
        listUrls = []

        data.sites?.forEach (site) ->
            listUrls.push
                name: 'url'
                value: site.url
                type: site.name

        data.profiles?.forEach (profile) ->
            listUrls.push
                name: 'url'
                value: profile.url
                type: 'linkedin'

        data.twitter?.forEach (twitter) ->
            listUrls.push
                name: 'url'
                value: twitter.url
                type: 'twitter'

        listUrls


    # Currently there isn't a good address parser. So all the addresses are set
    # in the locality fields. The Linkedin API defines some fields
    # precisely but we can only handle properly the country. That's why this
    # function keeps only the country.
    # When we'll have a correct address parser we'll be able to include
    # region and locality.
    getAddresses: (data) ->
        listAddresses = []

        if data.location?
            segmentAddress = data.location.split(', ')
                .reverse()
            country = segmentAddress[0] or ''
            #region = segmentAddress[1] or ''
            #locality = segmentAddress[2] or ''

        data.addresses?.forEach (address) ->
            addressArray = ContactHelper.adrStringToArray address.raw
            addressArray[6] = country

            listAddresses.push
                name: 'adr'
                value: addressArray
                type: 'main'

        listAddresses

module.exports = linkedin
