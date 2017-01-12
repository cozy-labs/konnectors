![Travis build status shield](https://img.shields.io/travis/cozy-labs/konnectors.svg)
![NPM release version shield](https://img.shields.io/npm/v/konnectors.svg)
![Github Release version shield](https://img.shields.io/github/tag/cozy-labs/konnectors.svg)
![NPM Licence shield](https://img.shields.io/npm/l/konnectors.svg)

[![Build Status](https://api.travis-ci.org/cozy-labs/konnectors.svg?branch=master)](https://travis-ci.org/cozy-labs/konnectors)

[Cozy][cozy] MyAccounts
=======================


What's Cozy?
------------

![Cozy Logo](https://cdn.rawgit.com/cozy/cozy-guidelines/master/templates/cozy_logo_small.svg)

[Cozy] is a platform that brings all your web services in the same private space.  With it, your webapps and your devices can share data easily, providing you with a new experience. You can install Cozy on your own hardware where no one's tracking you.


What's MyAccounts (previously known as Konnectors)?
------------------

Collection of connectors to fetch data from different websites and save them into your Cozy.


Available connectors
--------------------

The connectors marked with :x: are known as currently broken.

### Bills

| Website                 | Data | Maintainer                                            | Status                                                                                        |
|:------------------------|:-----|:------------------------------------------------------|:----------------------------------------------------------------------------------------------|
| Ameli                   | PDF  | Gara64                                                | :white_check_mark:                                                                            |
| APRR                    | PDF  | SomeAverageDev                                        | :white_check_mark:                                                                            |
| Bouygues Box            | PDF  | doubleface                                            | :x: ([#498](https://github.com/cozy-labs/konnectors/issues/498))                              |
| Bouygues Telecom Mobile | PDF  | doubleface                                            | :x: ([#498](https://github.com/cozy-labs/konnectors/issues/498)                               |
| Captain Train           | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Digital Ocean           | PDF  | Frank Rousseau                                        | :white_check_mark:                                                                            |
| Direct Energie          | PDF  | bnjbvr                                                | :white_check_mark:                                                                            |
| Electrabel              | PDF  | ZeHiro (looking for a maintainer with credentials)    | :white_check_mark:                                                                            |
| Free                    | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Free Mobile             | PDF  | ZeHiro                                                | :white_check_mark:                                                                            |
| Github                  | PDF  | doubleface                                            | :white_check_mark:                                                                            |
| Malakoff Mederic        | PDF  | Gara64                                                | :white_check_mark:                                                                            |
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

### Internet Of Things

| Website  | Data                                     | Maintainer                                | Status                                                                                                                             |
|:---------|:-----------------------------------------|:------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------|
| Jawbone  | Move and Sleep data                      | looking for a maintainer with credentials | :white_check_mark:                                                                                                                 |
| Nest     | Temperatures                             | looking for a maintainer with credentials | :white_check_mark:                                                                                                                 |
| Withings | Weight, Heartbeat and Blood Presure data | looking for a maintainer with credentials | :warning: ([#352](https://github.com/cozy-labs/konnectors/issues/352), [#260](https://github.com/cozy-labs/konnectors/issues/260)) |

### Social

| Website  | Data                | Maintainer | Status                                                                |
|:---------|:--------------------|:-----------|:----------------------------------------------------------------------|
| Github   | Commits             | doubleface | :white_check_mark:                                                    |
| Twitter  | Published tweets    | doubleface | :white_check_mark:                                                    |
| Linkedin | contact information | Peltoche   | :x: ([#396](https://github.com/cozy-labs/konnectors/issues/396))      |
| Google   | contact information | jacquarg   | :warning:([#541](https://github.com/cozy-labs/konnectors/issues/541)) |

### Events

| Website           | Data            | Maintainer     | Status                                                                 |
|:------------------|:----------------|:---------------|:-----------------------------------------------------------------------|
| Ical Feed         | Events          | Cozy           | :white_check_mark:                                                     |
| Contact Birthdays | Events          | Frank Rousseau | :white_check_mark:                                                     |
| Doctolib          | Events          | ZeHiro         | :white_check_mark:                                                     |
| Facebook          | Events          | jacquarg       | :warning: ([#420](https://github.com/cozy-labs/konnectors/issues/420)) |
| SNCF              | Events          | Chocobozzz     | :white_check_mark:                                                     |
| Google            | Events          | Cozy           | :white_check_mark:                                                     |
| Isen              | Events, lessons | Cozy           | :white_check_mark:                                                     |
| Meetup            | Events          | JbIPS          | :white_check_mark:                                                     |

### Productivity

| Website    | Data      | Maintainer                                | Status             |
|:-----------|:----------|:------------------------------------------|:-------------------|
| RescueTime | Activites | looking for a maintainer with credentials | :white_check_mark: |

### Hobbies

| Website  | Data                    | Maintainer | Status             |
|:---------|:------------------------|:-----------|:-------------------|
| Podcasts | Audio podcasts episodes | Babolivier | :white_check_mark: |


Hack
----

### Install and run in dev mode

Hacking the MyAccounts app requires you to [setup a dev environment][setup].

You can then clone the app repository and install dependencies:

```sh
$ git clone https://github.com/cozy-labs/konnectors.git
$ cd konnectors
$ npm install
```

:pushpin: If you use a node environment wrapper like [nvm] or [ndenv], don't forget to set your local node version before doing a `npm install`.

Cozy's apps use a standard set of _npm scripts_ to run common tasks. You can so start you development workflow with:

```sh
$ cd konnectors
$ npm run watch
```

and point your browser to http://localhost:9358.

For more information about how to build konnectors, just take a look at our [wiki].


### Run it inside the VM

You can easily view your current running app in your VM, use [cozy-dev]:

```sh
# in a terminal, run your app in watch mode
$ cd konnectors
$ npm run watch
```

```sh
# in another terminal, install cozy-dev (first time) and run the deploy
$ cd konnectors
$ npm install -g cozy-dev
$ cozy-dev deploy 9358
```

your app is available in your vm dashboard at http://localhost:9104.


### Tests

Tests are run by [mocha] under the hood, and written using [chai] and [sinon]. You can easily run the tests suite with:

```sh
$ cd konnectors
$ npm run test
```

:pushpin: Don't forget to update / create new tests when you contribute to code to keep the app the consistent.


### Models

The Cozy datastore stores documents, which can be seen as JSON objects. A `doctype` is simply a declaration of the fields in a given JSON object, to store similar objects in an homogeneous fashion.

Cozy ships a [built-in list of `doctypes`][doctypes] for representation of most of the common documents (Bills, Contacts, Events, ...).

Whenever your app needs to use a given `doctype`, you should:

- Check if this is a standard `doctype` defined in Cozy itself. If this is the case, you should add a model declaration in your app containing at least the fields listed in the [main fields list for this `doctype`][doctypes]. Note that you can extend the Cozy-provided `doctype` with your own customs fields. This is typically what is done in [Konnectors] for the [Bill `doctype`][bill-doctype].
- If no standards `doctypes` fit your needs, you should define your own `doctype` in your app. In this case, you do not have to put any field you want in your model, but you should crosscheck other cozy apps to try to homogeneize the names of your fields, so that your `doctype` data could be reused by other apps. This is typically the case for the [Konnector `doctype`][konnector-doctype] in [Konnectors].


### Resources

All documentation is located in the `/docs` app directory. It provides an exhaustive documentation about workflows (installation, development, pull-requests…), architecture, code consistency, data structures, dependencies, and more.

Feel free to read it and fix / update it if needed, all comments and feedback to improve it are welcome!


### Open a Pull-Request

If you want to work on MyAccounts and submit code modifications, feel free to open pull-requests! See the [contributing guide][contribute] for more information about how to properly open pull-requests.


Community
---------

### Localization

Localization and translations are handled by [Transifex][tx], which is used by all Cozy's apps.

As a _translator_, you can login to [Transifex][tx-signin] (using your Github account) and claim an access to the [app repository][tx-app]. Locales are pulled when app is build before publishing.

As a _developer_, you must [configure the transifex client][tx-client], and claim an access as _maintainer_ is the [app repository][tx-app]. Then please **only update** the source locale file (usually `en.json` in client and/or server parts), and push it to Transifex repository using the `tx push -s` command.


### Maintainer

The lead maintainers for MyAccounts is @m4dz for Cozy Cloud, and @ZeHiro, @doubleface and @nicofrand for the community ; send them a :beers: to say hello!


### Get in touch

You can reach the Cozy Community by:

- Chatting with us on IRC [#cozycloud on Freenode][freenode]
- Posting on our [Forum]
- Posting issues on the [Github repos][github]
- Say Hi! on [Twitter]


License
-------

Cozy MyAccounts is developed by Cozy Cloud and distributed under the [AGPL v3 license][agpl-3.0].



[cozy]: https://cozy.io "Cozy Cloud"
[setup]: https://dev.cozy.io/#set-up-the-development-environment "Cozy dev docs: Set up the Development Environment"
[wiki]: https://github.com/cozy-labs/konnectors/wiki#steps-to-write-a-new-konnector
[doctypes]: https://dev.cozy.io/#main-document-types
[bill-doctype]: https://github.com/cozy-labs/konnectors/blob/master/server/models/bill.coffee
[konnector-doctype]: https://github.com/cozy-labs/konnectors/blob/master/server/models/konnector.coffee
[konnectors]: https://github.com/cozy-labs/konnectors
[agpl-3.0]: https://www.gnu.org/licenses/agpl-3.0.html
[contribute]: CONTRIBUTING.md
[tx]: https://www.transifex.com/cozy/
[tx-signin]: https://www.transifex.com/signin/
[tx-app]: https://www.transifex.com/cozy/myaccounts/dashboard/
[tx-client]: http://docs.transifex.com/client/
[freenode]: http://webchat.freenode.net/?randomnick=1&channels=%23cozycloud&uio=d4
[forum]: https://forum.cozy.io/
[github]: https://github.com/cozy/
[twitter]: https://twitter.com/mycozycloud
[nvm]: https://github.com/creationix/nvm
[ndenv]: https://github.com/riywo/ndenv
[cozy-dev]: https://github.com/cozy/cozy-dev/
[mocha]: https://mochajs.org/
[chai]: http://chaijs.com/
[sinon]: http://sinonjs.org/
[checkbox]: https://help.github.com/articles/basic-writing-and-formatting-syntax/#task-lists
