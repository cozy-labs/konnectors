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

## Bills

| Website                 | Data | Maintainer                                            | Status                                                                                        |
|:------------------------|:-----|:------------------------------------------------------|:--------------------------|
| Ameli                   | PDF  | Gara64                                                | :white_check_mark:                                                                            |
| APRR                    | PDF  | SomeAverageDev                                        | :white_check_mark:                                                                            |
| Bouygues Box            | PDF  | doubleface                                            | :white_check_mark:                                                                            |
| Bouygues Telecom Mobile | PDF  | doubleface                                            | :white_check_mark:                                                                            |
| Captain Train           | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Digital Ocean           | PDF  | Frank Rousseau                                        | :white_check_mark:                                                                            |
| Direct Energie          | PDF  | bnjbvr                                                | :white_check_mark:                                                                            |
| Electrabel              | PDF  | ZeHiro (looking for a maintainer with credentials)    | :white_check_mark:                                                                            |
| Free                    | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Free Mobile             | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Github                  | PDF  | doubleface                                            | :white_check_mark:                                                                            |
| Materiel.net            | PDF  | nicofrand                                             | :white_check_mark:                                                                            |
| Numéricable             | PDF  | nicofrand                                             | :white_check_mark:                                                                            |
| OVH CA                  | PDF  | Chocobozzz                                            | :x: ([needs an app token](https://github.com/cozy-labs/konnectors/issues/370))                |
| OVH EU                  | PDF  | Chocobozzz                                            | :warning: ([issue on first import](https://github.com/cozy-labs/konnectors/issues/212))       |
| SoYouStart CA           | PDF  | Chocobozzz                                            | :x: ([needs an app token](https://github.com/cozy-labs/konnectors/issues/372))                |
| SoYouStart EU           | PDF  | Chocobozzz                                            | :x: ([needs an app token](https://github.com/cozy-labs/konnectors/issues/371))                |
| Kimsufi CA              | PDF  | Chocobozzz                                            | :x: ([needs an app token](https://github.com/cozy-labs/konnectors/issues/374))                |
| Kimsufi EU              | PDF  | Chocobozzz                                            | :x: ([needs an app token](https://github.com/cozy-labs/konnectors/issues/373))                |
| Runabove                | PDF  | Chocobozzz                                            | :warning: ([issue on first import](https://github.com/cozy-labs/konnectors/issues/212))       |
| Online.net              | PDF  | Chocobozzz                                            | :white_check_mark:                                                                            |
| Orange                  | PDF  | Frank Rousseau                                        | :warning: ([only for individual account](https://github.com/cozy-labs/konnectors/issues/365)) |
| Sosh                    | PDF  | Frank Rousseau                                        | :warning: ([only for individual account](https://github.com/cozy-labs/konnectors/issues/364)) |
| SFR box                 | PDF  | creator:doubleface                                    | :white_check_mark:                                                                            |
| SFR mobile              | PDF  | creator:doubleface, nicofrand                         | :white_check_mark:                                                                            |
| Virgin mobile           | PDF  | nicofrand (looking for a maintainer with credentials) | :white_check_mark:                                                                            |
| Uber                    | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Vente-privée.com        | PDF  | SomeAverageDev                                        | :warning: ([only the last bill](https://github.com/cozy-labs/konnectors/issues/351))          |

## Internet Of Things

| Website  | Data                                     | Maintainer | Status                                                                                                                             |
|:---------|:-----------------------------------------|:-----------|:-----------------------------------------------------------------------------------------------------------------------------------|
| Jawbone  | Move and Sleep data                      | looking for a maintainer with credentials          | :white_check_mark:                                                                                                                 |
| Nest     | Temperatures                             | looking for a maintainer with credentials          | :white_check_mark:                                                                                                                 |
| Withings | Weight, Heartbeat and Blood Presure data | looking for a maintainer with credentials          | :warning: ([#352](https://github.com/cozy-labs/konnectors/issues/352), [#260](https://github.com/cozy-labs/konnectors/issues/260)) |

## Social

| Website  | Data                | Maintainer | Status                                                           |
|:---------|:--------------------|:-----------|:-----------------------------------------------------------------|
| Github   | Commits             | doubleface | :white_check_mark:                                               |
| Twitter  | Published tweets    | doubleface | :white_check_mark:                                               |
| Linkedin | contact information | Peltoche   | :x: ([#396](https://github.com/cozy-labs/konnectors/issues/396)) |
| Google   | contact information | jacquarg   | :x:([#492](https://github.com/cozy-labs/konnectors/issues/482))  |

## Events

| Website           | Data            | Maintainer     | Status                                                                 |
|:------------------|:----------------|:---------------|:-----------------------------------------------------------------------|
| Ical Feed         | Events          | Cozy              | :white_check_mark:                                                     |
| Contact Birthdays | Events          | Frank Rousseau | :white_check_mark:                                                     |
| Doctolib          | Events          | ZeHiro         | :white_check_mark:                                                     |
| Facebook          | Events          | jacquarg       | :warning: ([#420](https://github.com/cozy-labs/konnectors/issues/420)) |
| SNCF              | Events          | Chocobozzz     | :white_check_mark:                                                     |
| Google            | Events          | Cozy              | :white_check_mark:                                                     |
| Isen              | Events, lessons | Cozy           | :white_check_mark:                                                     |

## Productivity

| Website    | Data      | Maintainer | Status             |
|:-----------|:----------|:-----------|:-------------------|
| RescueTime | Activites | looking for a maintainer with credentials          | :white_check_mark: |

## Hobbies

| Website  | Data                    | Maintainer | Status             |
|:---------|:------------------------|:-----------|:-------------------|
| Podcasts | Audio podcasts episodes | Babolivier | :white_check_mark: |

# Build

To build this application:

    npm install
    npm run build

# Tests

To run tests type the following command into the app folder:

    npm test

In order to run the tests, you only need to have the Data System started.
