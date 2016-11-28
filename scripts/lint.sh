#!/usr/bin/env bash
PATH="./node_modules/.bin:$PATH"

coffeelint -f coffeelint.json -r --color=always . &&\
eslint  server/konnectors/*.js
