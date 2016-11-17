"use strict"

const webpack = require('webpack')


const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyPlugin        = require('copy-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');

const optimize = false;
const cssOptions = optimize? 'css?-svgo&-autoprefixer&-mergeRules':'css';
const imgPath = 'img/' + '[name]' + (optimize? '.[hash]': '') + '.[ext]';

module.exports = {
    entry: './app',
    resolve: {
        extensions: ['', '.js', '.json', '.vue']
    },
    debug: !optimize,
    devtool: 'source-map',

    module: {
        loaders: [
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
                include: /sprites/,
                loader: 'svg-sprite?name=[name]_[hash]'
            },
            {
                test: /\.(png|gif|jpe?g|svg)$/i,
                exclude: /(vendor|sprites)/,
                loader: 'file?name=' + imgPath
            }
        ]
    },

            /*
    plugins: [
        new ExtractTextPlugin('app.css'),
        new CopyPlugin([ { from: 'vendor/assets', ignore: ['.gitkeep'] }]),
        new BrowserSyncPlugin({
            proxy: 'http://localhost:' + (process.env.PORT || 9358) + '/',
            open: false
        })
    ],
*/
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
