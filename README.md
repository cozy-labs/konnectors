# Konnectors

[![Build Status](https://travis-ci.org/cozy-labs/konnectors.svg)](https://travis-ci.org/cozy-labs/konnectors)

Collection of connectors to fetch data from different websites and save them
into your Cozy.

If you want to build your own connector, here is [a complete documentation](https://github.com/cozy-labs/konnectors/wiki)

# Contributing rules

Before opening any pull requests make sure that you follow these rules:

* Make your pull requests on the master branch.
* Follow the [Cozy Guidelines](https://github.com/cozy/cozy-guidelines).
* Make sure that `npm run lint` doesn't return any errors.
* Do not include the build in your pull request.
* For konnector addition, make sure that the following locale keys are present:
 * 'konnector description my_connector_name': explains what the connector does
 * Notification texts: if your connector pops up notifications on completed fetch,
   it requires a localized text (use any of the existing docTypes notification or create your own key).
* You have updated the connector list (if relevant)
* Explain in the Pull Request which problem is solved and how you fixed it (plateform changes).

# Available connectors

The connectors marked with :x: are known as currently broken.

*Bills*

* Ameli (Bill PDFs) :x:
* APRR (Bill PDFs)
* Bouygues Telecom (Bill PDFs)
* Bouygues Box (Bill PDFs)
* Captain Train (Bill PDFs)
* Digital Ocean (Bill PDFs)
* Direct Energie (Bill PDFś)
* Electrabel (Bill PDFs)
* Free (Bill PDFs)
* Free Mobile (Bill PDFs)
* Github (Bill PDFs)
* Materiel.net (Bill PDFs)
* Numericable (Bill PDFs)
* OVH (Bill PDFs) :x:
* Online.net (Bill PDFs)
* Orange (Bill PDFs)
* Sosh (Bill PDFs)
* SFR (Bill PDFs)
* Virgin Mobile (Bill PDFs)
* Uber (Bill PDFs)
* Vente-Privee.com (Bill PDFs)

*Internet Of Things*

* Jawbone (Move and Sleep data)
* Nest (temperatures)
* Withings (Weight, Heartbeat and Blood Presure data)

*Social*

* Github (commits)
* Twitter (published tweets)
* Linkedin (contact information) :x:
* Google (contact information)

*Calendar*

* Ical Feed (events)
* Contact Birthdays (events)
* Doctolib (events)
* Facebook (events)
* SNCF (events)
* Google (events)

*Productivity*

* RescueTime (activities)

*Hobbies*

* Podcasts (audio podcasts episodes)

# Build

To build this application:

    npm install
    npm run build

# Tests

To run tests type the following command into the app folder:

    npm test

In order to run the tests, you must only have the Data System started.
