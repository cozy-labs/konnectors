#!/usr/bin/env bash

./node_modules/.bin/coffeelint -f coffeelint.json -r --color=always .
./node_modules/.bin/eslint  server/konnectors/linkedin.js
