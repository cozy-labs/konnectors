fs = require 'fs'
path = require 'path'

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
getKonnectorModules = ->
    modules = {}
    moduleFiles = fs.readdirSync modulesPath

    for moduleFile in moduleFiles
        if isCoffeeOrJsFile moduleFile
            name = moduleFile.split('.')[0]
            modulePath = "../konnectors/#{name}"
            modules[name] = require modulePath

    return modules


module.exports = getKonnectorModules()
