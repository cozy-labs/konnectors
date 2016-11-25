'use strict'

const path = require('path')
const fs   = require('fs')

const webpack = require('webpack')

const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CopyPlugin        = require('copy-webpack-plugin')
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')


// use the `OPTIMIZE` env to switch from dev to production build
const optimize = process.env.OPTIMIZE === 'true'


/**
 * Loaders used by webpack
 *
 * - CSS and images files from `vendor` are excluded
 * - stylesheets are optimized via cssnano, minus svgo and autoprefixer that are
 * customized via PostCSS
 * - images are cache-busted in production build
 */
const cssOptions = optimize? 'css?-svgo&-autoprefixer&-mergeRules':'css'
const imgPath = 'img/' + '[name]' + (optimize? '.[hash]': '') + '.[ext]'

let loaders = [
    {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
    },
    {
        test: /\.vue$/,
        loader: 'vue'
    },
    {
        test: /\.json$/,
        loader: 'json'
    },
    {
        test: /\.svg$/,
        include: /(sprites|icons)/,
        loader: 'svg-sprite?name=[name]_[hash]'
    },
    {
        test: /\.(png|gif|jpe?g|svg)$/i,
        exclude: /(vendor|sprites|icons)/,
        loader: 'file?name=' + imgPath
    }
];

/**
 * Configure Webpack's plugins to tweaks outputs:
 *
 * all builds:
 * - ExtractTextPlugin: output CSS to file instead of inlining it
 * - CopyPlugin: copy assets to public dir
 *
 * prod build:
 * - AssetsPlugin: paths to cache-busted's assets to read them from server
 * - DedupePlugin
 * - OccurenceOrderPlugin
 * - UglifyJsPlugin
 * - DefinePlugin: disable webpack env dev vars
 *
 * dev build:
 * - BrowserSyncPlugin: make hot reload via browsersync exposed at
 *   http://localhost:3000, proxified to the server app port
 */
let plugins = [
    new ExtractTextPlugin(optimize? 'app.[hash].css' : 'app.css'),
    new CopyPlugin([
        { from: 'vendor/assets', ignore: ['.gitkeep'] }
    ])
];

if (optimize) {
    plugins = plugins.concat([
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.optimize.UglifyJsPlugin({
            mangle: true,
            compress: {
                warnings: false
            },
        }),
        new webpack.DefinePlugin({
            __SERVER__:      !optimize,
            __DEVELOPMENT__: !optimize,
            __DEVTOOLS__:    !optimize
        }),
        function() {
            this.plugin("done", function(stats) {
                fs.writeFileSync(
                    path.join(__dirname, '..', 'build', 'assets.json'),
                    '{"hash":"' + stats.hash + '"}'
                );
            });
        }
    ]);
} else {
    plugins = plugins.concat([
        new BrowserSyncPlugin({
            proxy: 'http://localhost:' + (process.env.PORT || 9358) + '/',
            open: false
        })
    ]);
}


/**
 * Webpack config
 *
 * - output to `public` dir
 * - cache-bust assets when build for production
 */

module.exports = {
    entry: './app',
    output: {
        path: path.join(optimize? '../build/client' : '.', 'public'),
        filename: optimize? 'app.[hash].js' : 'app.js'
    },
    resolve: {
        extensions: ['', '.js', '.json', '.vue']
    },
    debug: !optimize,
    devtool: 'source-map',
    module: {
        loaders: loaders
    },
    plugins: plugins,
    vue: {
        loaders: {
            css: ExtractTextPlugin.extract('style', cssOptions),
            stylus: ExtractTextPlugin.extract('style', cssOptions + '!stylus')
        },
        postcss: [
            require('autoprefixer')(['last 2 versions']),
            require('css-mqpacker')
        ]
    },
    stylus: {
        use: [require('cozy-ui/lib/stylus')()]
    }
};
