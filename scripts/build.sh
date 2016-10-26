#!/usr/bin/env bash

echo "Clean previous server"
rm -rf build/server && mkdir -p build/server
echo "Previous server cleaned."

./scripts/build_server.sh

echo "Clean previous client build..."
rm -rf build/client && mkdir -p build/client/app
echo "Previous client cleaned."

echo "Build entry point..."
./node_modules/.bin/jade ./client/index.jade -c --out ./build/client/
echo "var jade = require('jade/runtime');module.exports=" | \
    cat - ./build/client/index.js > ./build/client/index.js.tmp
mv ./build/client/index.js.tmp ./build/client/index.js
echo "Entry point built."

echo "Build locales..."
./node_modules/.bin/coffee -cb --output build/client/app/locales ./client/app/locales
echo "Locales built."

echo "Build client..."
cd client/ && npm i && ./node_modules/.bin/brunch build --production && cd ..
cp -R client/public build/client/
echo "Client built."
