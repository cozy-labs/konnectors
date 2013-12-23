path = require 'path'
fs = require 'fs'

log = require('printit')()

Konnector = require '../models/konnector'

modulesPath = './server/konnectors'


getKonnectorModules = ->
    modules = {}
    moduleFiles = fs.readdirSync modulesPath
    for moduleFile in moduleFiles
        name = moduleFile.split('.')[0]
        modulePath = "../konnectors/#{name}"
        modules[name] = require modulePath
    modules


module.exports = (callback) ->
    Konnector.all (err, konnectors) ->
        if err
            console.log err
            callback err
        else
            konnectorHash = {}
            for konnector in konnectors
                konnectorHash[konnector.name] = konnector

            konnectorModules = getKonnectorModules()
            konnectorsToCreate = []

            for name, konnectorModule of konnectorModules
                unless konnectorHash[konnectorModule.name]?
                    konnectorsToCreate.push
                        name: konnectorModule.name
                        description: konnectorModule.description
                        fields: konnectorModule.fields

            recCreate = ->
                if konnectorsToCreate.length > 0
                    konnector = konnectorsToCreate.pop()
                    Konnector.create konnector, (err) ->
                        if err
                            callback err
                        else
                            recCreate()
                else
                    Konnector.all (err, konnectors) ->
                        callback null
            recCreate()
