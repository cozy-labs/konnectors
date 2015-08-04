// Generated by CoffeeScript 1.8.0
var File, americano, fs, log, moment, request;

fs = require('fs');

americano = require('cozydb');

request = require('request');

moment = require('moment');

log = require('printit')({
  prefix: 'file'
});

module.exports = File = americano.getModel('File', {
  path: String,
  name: String,
  creationDate: String,
  lastModification: String,
  "class": String,
  mime: String,
  size: Number,
  binary: Object,
  modificationHistory: Object,
  clearance: function(x) {
    return x;
  },
  tags: function(x) {
    return x;
  }
});

File.createNew = function(fileName, path, date, url, tags, callback) {
  var attachBinary, data, filePath, index, now, options, stream;
  now = moment().toISOString();
  filePath = "/tmp/" + fileName;
  data = {
    name: fileName,
    path: path,
    creationDate: now,
    lastModification: now,
    tags: tags,
    "class": 'document',
    mime: 'application/pdf'
  };
  index = function(newFile) {
    return newFile.index(["name"], function(err) {
      if (err) {
        log.error(err);
      }
      return File.find(newFile.id, function(err, file) {
        return callback(err, file);
      });
    });
  };
  attachBinary = function(newFile) {
    return newFile.attachBinary(filePath, {
      "name": "file"
    }, function(err) {
      if (err) {
        log.error(err);
        return callback(err);
      } else {
        return fs.unlink(filePath, function() {
          return index(newFile);
        });
      }
    });
  };
  options = {
    uri: url,
    method: 'GET',
    jar: true
  };
  stream = request(options, function(err, res) {
    var stats;
    if (res.statusCode === 200) {
      stats = fs.statSync(filePath);
      data.size = stats["size"];
      return File.create(data, function(err, newFile) {
        if (err) {
          log.error(err);
          return callback(err);
        } else {
          return attachBinary(newFile);
        }
      });
    }
  });
  return stream.pipe(fs.createWriteStream(filePath));
};
