'use strict';

const url               = require('url');
const path              = require('path');
const cozydb            = require('cozydb');
const request           = require('request');
const xml               = require('pixl-xml');
const NotifHelper       = require('cozy-notifications-helper');
const notifHelper       = new NotifHelper('konnectors');
const localization      = require('../lib/localization_manager');

const log               = require('printit')({
                            prefix: 'podcast',
                            date: true,
                        });

const baseKonnector     = require('../lib/base_konnector');
const filterExisting    = require('../lib/filter_existing');

/**************** Models ****************/
const File              = require('../models/file');
const Folder            = require('../models/folder');
const Track             = require('../models/track');


/**************************
* episodes = [{
*     name: String,
*     url: String,
*     file: File
* }]
**************************/
var episodes = new Array(),
    podcastName = new String(),
    alreadyExists = 0;
    

module.exports = baseKonnector.createNew({
    name: 'Podcast',

    models: [Track],

    fields: {
        url: 'text',
        folderPath: 'folder'
    },

    fetchOperations: [
        init,
        parseFeed,
        createFiles,
        createTracks,
        notify
    ]
});


// Initialize variables
function init(requiredFields, entries, data, next) {
    episodes = new Array();
    podcastName = new String();
    alreadyExists = 0;
    next();
}


// Retrieves the feed's URL from the user's input, then parse it, creates a
// folder for it, and pushes the retrieved episode into the global array
function parseFeed(requiredFields, entries, data, next) {
    log.debug("Downloading feed at " + requiredFields.url);
    requestFeed(requiredFields.url, (err, rawFeed) => {
        if(!rawFeed.length || !rawFeed.match(/^\s*</)) {
            let error = new Error("Invalid feed");
            log.error(error);
            return next(error);
        }
        // Parsing XML file
        log.debug("Parsing feed");
        let parsedFeed = xml.parse(rawFeed).channel;
        // Saving the podcast's name
        podcastName = parsedFeed.title;
        log.debug("Parsed feed for podcast " + podcastName);
        // Creating podcast's folder if it doesn't exist yet
        createFolderIfNotPresent(podcastName, requiredFields.folderPath
                                                                    , (err) => {
            if(err) {
                log.error(error);
                return next(error);
            }
            // Saving 5 latest episodes
            pushEpisodes(parsedFeed.item.slice(0, 5));
            log.debug("Episodes in array:");
            log.debug(episodes)
            next();
        });
    });
}


// Create files from the episodes' data
function createFiles(requiredFields, entries, data, next) {
    log.debug("Saving files");
    let files = episodes.map(function (episode) {
        return new Promise(function (saved) {
            let filename = path.basename(url.parse(episode.url).pathname);
            let pathname = requiredFields.folderPath + '/' + podcastName;
            // Creating the file
            createFileIfNotPresent(filename, pathname, episode.url, 
                                                                (err, file) => {
                if(err) {
                    log.error(error);
                    return next(error);
                }
                episode.file = file;
                saved();
            });
        });
    });
    // Wait for all the files to be created
    Promise.all(files).then(() => { next(); });
}


// Create Track elements in the DataSystem for each episode from the files
// previously created
function createTracks(requiredFields, entries, data, next) {
    log.debug("Saving tracks");
    let tracks = episodes.map(function (episode) {
        return new Promise(function (saved) {
            // Creating the tracks
            createTrackIfNotPresent(episode.name, episode.file._id, (err) => {
                if(err) {
                    log.error(error);
                    return next(error);
                }
                saved();
            });
        });
    });
    // Wait for all the tracks to be created
    Promise.all(tracks).then(() => { next(); });
}

// Notify the user on how many episodes have been retrieved
function notify(requiredFields, entries, data, next) {
    let count = episodes.length - alreadyExists;
    if(count > 0) {
        let options = {
            smart_count: count
        };
        let notifContent = localization.t("notification podcast", options);
        notifHelper.createTemporary({
            app: 'konnectors',
            text: notifContent,
            resource: {
                app: 'cozy-music',
                url: ''
            }
        });
    }
    next();
}


/**************** Internal usage ****************/


// Requests a RSS feed and passes it as a string to the callback
// feedUrl: String containing the URL to request
// next(err, rawFeed): Callback
function requestFeed(feedUrl, next) {
    request(feedUrl, (error, response, body) => {
        if(error) {
            log.error(error);
            return next(error);
        }
        if(!response.headers['content-type'].match(/xml/)) {
            let error = new Error("Feed's content type is not XML");
            log.error(error);
            return next(error);
        }
        next(null, body);
    });
}


// Push episodes to the episodes global array, formatted
// array: The array of episodes to push into the global array
function pushEpisodes(array) {
    for(let episode of array) {
        episodes.push({
            name: episode.title,
            url: episode.enclosure.url
        });
    }
}


// Check if a folder already exists and creates it if not
// name: Folder name
// path: Folder path
// next(err): Callback
function createFolderIfNotPresent(name, path, next) {
    Folder.all((err, folders) => {
        if(err) {
            log.error(err);
            next(err);
        }
        
        for(let folder of folders) {
            if(folder.name === name) {
                log.debug("Folder " + name + " already exists");
                return next();
            }
        }
        
        Folder.createNewFolder({
            name: name,
            path: path
        }, (err) => {
            if(err) {
                log.error(err);
                next(err);
            }
            next();
        });
    });
}


// Check if a file already exists and creates it if not
// name: File name
// path: File path
// url: URL to download the file from
// next(err, file): Callback
function createFileIfNotPresent(filename, path, url, next) {
    File.all({}, (err, files) => {
        if(err) {
            log.error(err);
            next(err);
        }
        
        for(let file of files) {
            if(file.name === filename && file.path === path) {
                log.debug("File " + filename + " already exists in " + path);
                return next(null, file);
            }
        }
        
        File.createNew(filename, path, url, [], (err, file) => {
            if(err) {
                log.error(err);
                return next(err);
            }
            log.debug("Saved file " + filename);
            next(null, file);
        });
    });
}


// Check if a track already exists and creates it if not
// trakName: Track name as it will appear in cozy-music
// fileID: ID identifying the file to link to the track
// next(err): Callback
function createTrackIfNotPresent(trackName, fileID, next) {
    Track.request("all", function (err, tracks) {
        if(err) {
            log.error(err);
            next(err);
        }
        
        for(let track of tracks) {
            // Not Darude - Sandstorm
            if(track.metas.title === trackName 
                && track.ressource.fileID === fileID) {
                log.debug("Track " + trackName + " already exists");
                alreadyExists++;
                return next();
            }
        }
        
        Track.createFromFile(trackName, fileID, (err) => {
            if(err) {
                log.error(error);
                return next(error);
            }
            log.debug("Saved track " + trackName);
            next();
        });
    });
}