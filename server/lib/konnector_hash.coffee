fs = require 'fs'
path = require 'path'

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

hash = getKonnectorModules()

module.exports = hash
