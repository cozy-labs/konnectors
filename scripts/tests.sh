#!/usr/bin/env bash

./node_modules/.bin/mocha \
    --reporter spec \
    --colors \
    --globals clearImmediate,setImmediate \
    --compilers coffee:coffee-script/register \
    tests
