#!/usr/bin/env bash
echo "Install clients dependencies..."
cd ./client
rm -rf node_modules/
npm install
cd ../
echo "clients dependencies installed."

echo "Start client tests..."
karma start client/karma.conf.js
echo "client tests are OK."
