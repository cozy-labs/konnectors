fs = require 'fs'
path = require 'path'

weboob = require './weboob'


currentPath = path.dirname fs.realpathSync __filename
modulesPath = path.join currentPath, '..', 'konnectors'


# Tell if filename is Javascript file or is a Coffeescript file. Detection
# is based on file extension.
isCoffeeOrJsFile = (fileName) ->
    extension = fileName.split('.')[1]
    firstChar = fileName[0]
    firstChar isnt '.' and (extension is 'coffee' or extension is 'js')


# Build a hash of all konnectors available where keys are module names and
# values are konnector modules.
getKonnectorModules = () ->
    modules = {}
    moduleFiles = fs.readdirSync modulesPath

    for moduleFile in moduleFiles
        if (fs.lstatSync(path.join modulesPath, moduleFile).isDirectory() or
            isCoffeeOrJsFile moduleFile)
                name = moduleFile.split('.')[0]
                modulePath = path.join modulesPath, name
                modules[name] = require modulePath
                if modules[name].default?
                    modules[name] = modules[name].default
    # Append weboob modules
    return (callback) ->
        weboob.default.getWeboobKonnectors (weboobKonnectors) ->
            weboobKonnectors.forEach (weboobKonnector) ->
                modules[weboobKonnector.name] = weboobKonnector
            callback modules

module.exports = getKonnectorModules()
