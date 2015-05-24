Folder = require '../models/folder'


# Controllers to manage the folder dropdown in konnector.
module.exports =


    # Return the list of all folders.
    all: (req, res, next) ->
        Folder.all (err, folders) ->
            if err then next err
            else
                res.send folders


    # Return given folder. This controller is required by the realtime engine
    # on client site. On modification, it requires to fetch the current state
    # of the changed folder.
    show: (req, res, next) ->
        id = req.params.folderId
        Folder.find id, (err, folder) ->
            if err then next err
            else if folder is null
                res.sendStatus 404
            else
                res.send folder

