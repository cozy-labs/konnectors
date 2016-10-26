echo "Build server files..."
echo "Building CoffeeScript..."
./node_modules/.bin/coffee -cb --output build/server server
./node_modules/.bin/coffee -cb --output build/ server.coffee
echo "Done!"
echo "Building ES6..."
./node_modules/.bin/babel ./server/konnectors -d build/server/konnectors > /dev/null
./node_modules/.bin/babel ./server/lib -d build/server/lib > /dev/null
echo "Done!"
echo "Server built."
