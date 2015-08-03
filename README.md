# Konnectors

[![Build Status](https://travis-ci.org/cozy-labs/konnectors.svg)](https://travis-ci.org/cozy-labs/konnectors)

Collection of connectors to fetch data from different websites and save them
into your Cozy.

# Available connectors

* RescueTime
* Jawbone (Move and Sleep data)
* Withings (Weight, Heartbeat and Blood Presure data)
* Twitter (published tweets)
* Github (Bill PDFs, commits)
* B&You (Bill PDFs)
* Free (Bill PDFs)
* Free Mobile (Bill PDFs)
* Nest (temperatures)

# What we would like to see

* weather tracker: store your location and track temperature and pluviometry.

# Build

To build this application:

    npm install
    cd client && npm install && cd ..
    cake build

# Tests

To run tests type the following command into the app folder:

    npm test

In order to run the tests, you must only have the Data System started.
