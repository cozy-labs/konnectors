var webpackConfig = require('./webpack.test.config.js')
delete webpackConfig.entry

module.exports = function(config) {
  config.set({
    browsers: ['Firefox'],

    frameworks: ['mocha'],

    files: [
      {pattern: 'app/*.js', included: false},
      {pattern: 'app/**/*.js', included: false},
      {pattern: 'test/**/*.spec.js', included: true, watched: false},
      'test/index.js'
    ],

    preprocessors: {
      "app/*.js": ["webpack"],
      "app/**/*.js": ["webpack"],
      "test/index.js": ["webpack"],
      "test/*.spec.js": ["webpack"]
    },

    plugins: [
     'karma-mocha',
     'karma-firefox-launcher',
     'karma-babel-preprocessor',
     'karma-webpack'
    ],

    webpack: webpackConfig,

    // avoid walls of useless text
    webpackMiddleware: {
      noInfo: true
    },

    singleRun: true
  });
};
