#!/usr/bin/env bash

./node_modules/.bin/coffeelint -f coffeelint.json -r --color=always . &&\
./node_modules/.bin/standard  "server/konnectors/*.js"
./node_modules/.bin/standard "client/**/*.js" "client/**/*.jsx"
