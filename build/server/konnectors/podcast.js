'use strict';

var url = require('url');
var path = require('path');
var async = require('async');
var request = require('request');
var xml = require('pixl-xml');
var NotifHelper = require('cozy-notifications-helper');
var localization = require('../lib/localization_manager');

var notifHelper = new NotifHelper('konnectors');

var log = require('printit')({
  prefix: 'podcast',
  date: true
});

var baseKonnector = require('../lib/base_konnector');

// Models
var File = require('../models/file');
var Folder = require('../models/folder');
var Track = require('../models/track');

/*
* episodes = [{
*   name: String,
*   url: String,
*   file: File
* }]
*/
var episodes = [];
var podcastName = '';
var alreadyExists = 0;

var connector = module.exports = baseKonnector.createNew({
  name: 'Podcast',

  category: 'others',
  color: {
    hex: '#40DE8E',
    css: '#40DE8E'
  },

  models: [Track],

  fields: {
    url: {
      type: 'text'
    },
    folderPath: {
      type: 'folder',
      advanced: true
    }
  },

  dataType: ['podcast'],

  fetchOperations: [init, parseFeed, createFiles, createTracks, notify]
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
  requestFeed(requiredFields.url, function (err, rawFeed) {
    if (err) return next(err);
    connector.logger.info('Raw feed fetched');

    if (!rawFeed.length || !rawFeed.match(/^\s*</)) {
      var error = new Error('Invalid feed');
      log.error(error);
      return next(error);
    }
    // Parsing XML file
    var parsedFeed = xml.parse(rawFeed).channel;
    // Saving the podcast's name
    podcastName = parsedFeed.title;
    // Creating podcast's folder if it doesn't exist yet
    return createFolderIfNotPresent(podcastName, requiredFields.folderPath, function (err) {
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

  async.eachSeries(episodes, function (episode, callback) {
    var filename = path.basename(url.parse(episode.url).pathname);
    var pathname = requiredFields.folderPath + '/' + podcastName;
    createFileIfNotPresent(filename, pathname, episode.url, function (err, file) {
      if (err) {
        log.error(err);
        return callback(err);
      }
      episode.file = file;
      callback();
    });
  }, function (err) {
    if (err) return next(err);
    connector.logger.info('File creations finished.');
    next();
  });
}

// Create Track elements in the DataSystem for each episode from the files
// previously created
function createTracks(requiredFields, entries, data, next) {
  connector.logger.info('Track creations started...');
  async.eachSeries(episodes, function (episode, callback) {
    createTrackIfNotPresent(episode.name, episode.file._id, function (err) {
      if (err) {
        log.error(err);
        return callback(err);
      }
      return callback();
    });
  }, function (err) {
    if (err) return next(err);
    connector.logger.info('Track creations finished.');
    next();
  });
}

// Notify the user on how many episodes have been retrieved
function notify(requiredFields, entries, data, next) {
  var count = episodes.length - alreadyExists;
  if (count > 0) {
    var options = {
      smart_count: count
    };
    var notifContent = localization.t('notification podcast', options);
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

// All functions below are only used internaly by the connector's main functions

// Requests a RSS feed and passes it as a string to the callback
// feedUrl: String containing the URL to request
// callback(err, rawFeed): Callback
function requestFeed(feedUrl, callback) {
  request(feedUrl, function (error, response, body) {
    if (error) {
      log.error(error);
      return callback(error);
    }
    if (!response.headers['content-type'].match(/xml/)) {
      var _error = new Error('Feed\'s content type is not XML');
      log.error(_error);
      return callback(_error);
    }
    return callback(null, body);
  });
}

// Push episodes to the episodes global array, formatted
// array: The array of episodes to push into the global array
function pushEpisodes(array) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = array[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var episode = _step.value;

      connector.logger.info(episode.title);
      episodes.push({
        name: episode.title,
        url: episode.enclosure.url
      });
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

// Check if a folder already exists and creates it if not
// name: Folder name
// path: Folder path
// callback(err): Callback
function createFolderIfNotPresent(foldername, folderpath, callback) {
  Folder.all(function (err, folders) {
    if (err) {
      log.error(err);
      callback(err);
    }

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = folders[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var folder = _step2.value;

        if (folder.name === foldername) {
          return callback();
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return Folder.createNewFolder({
      name: foldername,
      path: folderpath
    }, function (err) {
      connector.logger.info(foldername + ' folder created.');
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
  File.all({}, function (err, files) {
    if (err) {
      log.error(err);
      callback(err);
    }

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = files[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var file = _step3.value;

        if (file.name === filename && file.path === path) {
          return callback(null, file);
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    connector.logger.info('Creating ' + filename + '...');
    File.createNew(filename, path, url, [], function (err, file) {
      if (err) {
        log.error(err);
        return callback(err);
      }
      connector.logger.info('File ' + filename + ' created.');
      return callback(null, file);
    });
  });
}

// Check if a track already exists and creates it if not
// trakName: Track name as it will appear in cozy-music
// fileID: ID identifying the file to link to the track
// callback(err): Callback
function createTrackIfNotPresent(trackName, fileID, callback) {
  Track.request('all', function (err, tracks) {
    if (err) {
      log.error(err);
      callback(err);
    }

    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = tracks[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var track = _step4.value;

        // Not Darude - Sandstorm
        if (track.metas.title === trackName && track.ressource.fileID === fileID) {
          alreadyExists++;
          return callback();
        }
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    connector.logger.info('Creating track ' + trackName + '...');
    Track.createFromFile(trackName, fileID, function (err) {
      if (err) {
        log.error(err);
        return callback(err);
      }
      connector.logger.info('Track ' + trackName + ' created.');
      return callback();
    });
  });
}