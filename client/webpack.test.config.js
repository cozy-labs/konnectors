"use strict"

const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
    entry: './app',

    resolve: {
        extensions: ['', '.js', '.json', '.vue']
    },

    debug: true,

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
                loader: 'file?name=img/[name].[ext]'
            }
        ]
    },

    plugins: [
        new ExtractTextPlugin('app.css')
    ],

    vue: {
        loaders: {
            css: ExtractTextPlugin.extract('style', 'css'),
            stylus: ExtractTextPlugin.extract('style', 'css!stylus')
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
