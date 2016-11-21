#!/usr/bin/env bash
echo "Install clients dependencies..."
cd ./client
rm -rf node_modules/
npm install
cd ../
echo "clients dependencies installed."

echo "Execute Client Tests..."
karma start client/karma.conf.js
echo "Client tests are OK"
