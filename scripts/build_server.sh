#!/bin/sh
PATH="./node_modules/.bin:$PATH"

echo "Build server files..."
echo "Building CoffeeScript..."
coffee -cb --output build/server server
coffee -cb --output build/ server.coffee
echo "Done!"
echo "Building ES6..."
babel ./server/konnectors -d build/server/konnectors > /dev/null
babel ./server/lib -d build/server/lib > /dev/null
echo "Done!"
echo "Server built."
