'use strict';

const url = require('url');
const path = require('path');
const async = require('async');
const request = require('request');
const xml = require('pixl-xml');
const NotifHelper = require('cozy-notifications-helper');
const localization = require('../lib/localization_manager');

const notifHelper = new NotifHelper('konnectors');

const log = require('printit')({
  prefix: 'podcast',
  date: true,
});

const baseKonnector = require('../lib/base_konnector');

// Models
const File = require('../models/file');
const Folder = require('../models/folder');
const Track = require('../models/track');


/*
* episodes = [{
*   name: String,
*   url: String,
*   file: File
* }]
*/
let episodes = [];
let podcastName = '';
let alreadyExists = 0;


const connector = module.exports = baseKonnector.createNew({
  name: 'Podcast',

  models: [Track],

  fields: {
    url: 'text',
    folderPath: 'folder',
  },

  fetchOperations: [
    init,
    parseFeed,
    createFiles,
    createTracks,
    notify,
  ],
});


// Initialize variables
function init(requiredFields, entries, data, next) {
  episodes = [];
  podcastName = '';
  alreadyExists = 0;
  next();
}


// Retrieves the feed's URL from the user's input, then parse it, creates a
// folder for it, and pushes the retrieved episode into the global array
function parseFeed(requiredFields, entries, data, next) {
  requestFeed(requiredFields.url, (err, rawFeed) => {
    if (err) return next(err);
    connector.logger.info('Raw feed fetched');

    if (!rawFeed.length || !rawFeed.match(/^\s*</)) {
      const error = new Error('Invalid feed');
      log.error(error);
      return next(error);
    }
    // Parsing XML file
    const parsedFeed = xml.parse(rawFeed).channel;
    // Saving the podcast's name
    podcastName = parsedFeed.title;
    // Creating podcast's folder if it doesn't exist yet
    return createFolderIfNotPresent(podcastName, requiredFields.folderPath
    , (err) => {
      if (err) {
        log.error(err);
        return next(err);
      }
      // Saving 5 latest episodes
      connector.logger.info('Saving last five episodes');
      pushEpisodes(parsedFeed.item.slice(0, 5));
      return next();
    });
  });
}


// Create files from the episodes' data
function createFiles(requiredFields, entries, data, next) {
  connector.logger.info('File creations started...');

  async.eachSeries(episodes, (episode, callback) => {
    const filename = path.basename(url.parse(episode.url).pathname);
    const pathname = `${requiredFields.folderPath}/${podcastName}`;
    createFileIfNotPresent(filename, pathname, episode.url, (err, file) => {
      if (err) {
        log.error(err);
        return callback(err);
      }
      episode.file = file;
      callback();
    });
  }, (err) => {
    if (err) return next(err);
    connector.logger.info('File creations finished.');
    next();
  });
}


// Create Track elements in the DataSystem for each episode from the files
// previously created
function createTracks(requiredFields, entries, data, next) {
  connector.logger.info('Track creations started...');
  async.eachSeries(episodes, (episode, callback) => {
    createTrackIfNotPresent(episode.name, episode.file._id, (err) => {
      if (err) {
        log.error(err);
        return callback(err);
      }
      return callback();
    });
  }, (err) => {
    if (err) return next(err);
    connector.logger.info('Track creations finished.');
    next();
  });
}

// Notify the user on how many episodes have been retrieved
function notify(requiredFields, entries, data, next) {
  const count = episodes.length - alreadyExists;
  if (count > 0) {
    const options = {
      smart_count: count,
    };
    const notifContent = localization.t('notification podcast', options);
    notifHelper.createTemporary({
      app: 'konnectors',
      text: notifContent,
      resource: {
        app: 'cozy-music',
        url: '',
      },
    });
  }
  next();
}


// All functions below are only used internaly by the connector's main functions


// Requests a RSS feed and passes it as a string to the callback
// feedUrl: String containing the URL to request
// callback(err, rawFeed): Callback
function requestFeed(feedUrl, callback) {
  request(feedUrl, (error, response, body) => {
    if (error) {
      log.error(error);
      return callback(error);
    }
    if (!response.headers['content-type'].match(/xml/)) {
      const error = new Error('Feed\'s content type is not XML');
      log.error(error);
      return callback(error);
    }
    return callback(null, body);
  });
}


// Push episodes to the episodes global array, formatted
// array: The array of episodes to push into the global array
function pushEpisodes(array) {
  for (const episode of array) {
    connector.logger.info(episode.title);
    episodes.push({
      name: episode.title,
      url: episode.enclosure.url,
    });
  }
}


// Check if a folder already exists and creates it if not
// name: Folder name
// path: Folder path
// callback(err): Callback
function createFolderIfNotPresent(foldername, folderpath, callback) {
  Folder.all((err, folders) => {
    if (err) {
      log.error(err);
      callback(err);
    }

    for (const folder of folders) {
      if (folder.name === foldername) {
        return callback();
      }
    }

    return Folder.createNewFolder({
      name: foldername,
      path: folderpath,
    }, (err) => {
      connector.logger.info(`${foldername} folder created.`);
      if (err) {
        log.error(err);
        callback(err);
      }
      return callback();
    });
  });
}


// Check if a file already exists and creates it if not
// name: File name
// path: File path
// url: URL to download the file from
// callback(err, file): Callback
function createFileIfNotPresent(filename, path, url, callback) {
  File.all({}, (err, files) => {
    if (err) {
      log.error(err);
      callback(err);
    }

    for (const file of files) {
      if (file.name === filename && file.path === path) {
        return callback(null, file);
      }
    }

    connector.logger.info(`Creating ${filename}...`);
    File.createNew(filename, path, url, [], (err, file) => {
      if (err) {
        log.error(err);
        return callback(err);
      }
      connector.logger.info(`File ${filename} created.`);
      return callback(null, file);
    });
  });
}


// Check if a track already exists and creates it if not
// trakName: Track name as it will appear in cozy-music
// fileID: ID identifying the file to link to the track
// callback(err): Callback
function createTrackIfNotPresent(trackName, fileID, callback) {
  Track.request('all', (err, tracks) => {
    if (err) {
      log.error(err);
      callback(err);
    }

    for (const track of tracks) {
      // Not Darude - Sandstorm
      if (track.metas.title === trackName
          && track.ressource.fileID === fileID) {
        alreadyExists++;
        return callback();
      }
    }

    connector.logger.info(`Creating track ${trackName}...`);
    Track.createFromFile(trackName, fileID, (err) => {
      if (err) {
        log.error(err);
        return callback(err);
      }
      connector.logger.info(`Track ${trackName} created.`);
      return callback();
    });
  });
}
