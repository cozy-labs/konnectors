var webpackConfig = require('./webpack.test.config.js')
delete webpackConfig.entry

module.exports = function(config) {
  config.set({
    basePath: '',

    browsers: ['Firefox'],

    frameworks: ['mocha', 'sinon'],

    reporters: ['mocha'],

    files: [
      "test/index.js"
    ],

    preprocessors: {
      "test/index.js": ["webpack"],
    },

    plugins: [
     'karma-mocha',
     'karma-mocha-reporter',
     'karma-firefox-launcher',
     'karma-babel-preprocessor',
     'karma-webpack',
     'karma-sinon'
    ],

    webpack: webpackConfig,

    // avoid walls of useless text
    webpackMiddleware: {
      noInfo: true
    },

    singleRun: true
  });
};
