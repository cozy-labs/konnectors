Folder = require '../models/folder'


module.exports =
    all: (req, res, next) ->
        Folder.allPath (err, paths) ->
            if err then next err
            else
                res.send paths
