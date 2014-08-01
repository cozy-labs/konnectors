path = require 'path'
fs = require 'fs'
log = require('printit')
    prefix: null
    date: true


Konnector = require '../models/konnector'

currentPath = path.dirname fs.realpathSync __filename
modulesPath = path.join currentPath, '..', 'konnectors'

isCoffeeFile = (fileName) ->
    extension = fileName.split('.')[1]
    firstChar = fileName[0]
    firstChar isnt '.' and extension is 'coffee'

getKonnectorModules = ->
    modules = {}
    moduleFiles = fs.readdirSync modulesPath
    for moduleFile in moduleFiles
        if isCoffeeFile moduleFile
            name = moduleFile.split('.')[0]
            modulePath = "../konnectors/#{name}"
            modules[name] = require modulePath
    modules


module.exports = (callback) ->
    Konnector.all (err, konnectors) ->
        if err
            log.error err
            callback err
        else
            konnectorHash = {}
            for konnector in konnectors
                konnectorHash[konnector.name] = konnector

            konnectorModules = getKonnectorModules()
            konnectorsToCreate = []

            for name, konnectorModule of konnectorModules
                unless konnectorHash[konnectorModule.name]?
                    konnectorsToCreate.push konnectorModule

            console.log 'cool'
            (recCreate = ->
                if konnectorsToCreate.length > 0
                    konnector = konnectorsToCreate.pop()
                    console.log konnector
                    konnector.init (err) ->
                        log.error err if err
                        delete konnector.init
                        Konnector.create konnector, (err) ->
                            log.error err if err
                            recCreate()
                else
                    log.info "all konnectors are created."
            )()
