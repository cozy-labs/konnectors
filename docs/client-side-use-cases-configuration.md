last edit: 2016-11-02 11:13
author: m4dz <code@m4dz.net>

---


Cozy MyAccounts Client Use-case
===============================

Abstract
--------

This document describes the context of using _use-cases_ in MyAccounts app, how they are related to the app and the stack, and how to customize them in hosting context.


What are use-cases?
-------------------

A **use-case** is a way to sort and filter accounts by an arbitrary denominator (e.g. _all accounts that concerns billing_). It allows a user to browse available accounts in a different way than browsing by categories. The user can discover some accounts by selecting first a _use-case_ (aka a scenario) that cover usages, and see what accounts can be suggested.

_MyAccounts_ can provide many _use-cases_, that can be configured, which means that an hoster can offer a different way to discover available accounts (aka present different _use-cases_).


How to define a use-case?
-------------------------

All _use-cases_ are declared in a manifest, built-in the client app, at `client/app/contexts/<context>/index.json`. Its architecture is defined in the _Architecture of the manifest_ section below.

The `context` value is the one that defines in which context _MyAccounts_ app run. There must be a `cozy` context, which is the default one available. Later, all partners can define their own _use-cases_ by adding a new context, with a dedicated manifest and locales (see _Localization_ section below about translations).

Adding a _use-case_ simply mean adding a new object into the _use-cases_ array, that provides the following keys (see the _Architecture_ section below for a complete list and informations):

- `slug`: `<String>` the slugname for the use-case
- `accounts`: `<Array[Obj]>` an array of objects defining the accounts
- `figure`: `<String>` the picture file that illustrate the use-case
- `color`: `<Color>` a color object that defines the color of the use-case
- `default`: `<Bool>` a `true|false` value that defines this use-case as the default one
- `important`: `<Bool>` should this `use-case` a recommended one?

For its first release, the manifest will be built-in the client app, to get it ready to work out-of-the-box. With the stack v2, we should serve the manifest behind a dedicated endpoint, so we won't need to build a specific version of _MyAccounts_ each time we need to provides different _use-cases_.


Default values
--------------

There's two kind of default values for a _use-case_:

### the `default` key

it defines if this _use-case_ is the default one. When we access the _use-cases_ screen (`/discover` URI), it offers a list of _use-cases_ screen, each one redirecting to a _use-case_ view (or the account if the _use-case_ only contains one).

Sometimes, we need to directly open a _use-case_ screen without passing by the `/discover` view (this is the case when user access to _MyAccounts_ from the onboarding). In this case, this is the default _use-case_ which is displayed.

⚠️ if the _use-cases_ array contains more than one _use-case_ with a default key set to `true`, then only the first one found in the array is considered as the default one.

### The _incentive_

When displaying a _use-case_ screen, an account can be highlighted first to incitate the user to first configure this one. Into the `accounts` array, the _account Object_ can define a `default` key at `true` to declare it as the _incentive_ one.

⚠️ as for the _use-cases_ array, if more than one account has a `default` key set to true, only the first one in the array is considered as the _incentive_ one.


Localization
------------

There's 2 kind of information that need to be translated:

1. the _use-case_ name (mandatory)
2. a _use-case_ description (optionnal)

To avoid having all translations for all use-cases embeded into the build app, even when the _use-cases_ aren't declared in the given context, all locales related to a context should belong to the context directly, so located in `client/app/contexts/<context>/locales/<lang>.json` file.

It uses a syntax like `use-case <slug> title` and `use-case <slug> description` as translation keys. Transifex remains the centralized tool for all translations, contexts included.


Architecture of the manifest
----------------------------

A manifest should have the following structure:

```json
{
  "use-cases": [{
    "slug": "the use-case slug",
    "accounts": [{
      "slug": "account-to-add-slugname",
      "default": true,
      "important": true
    }],
    "figure": "use-case_picture_file_name.ext",
    "color": {
      "css": "the CSS value of the use-case color"
    },
    "default": true,
    "important": true
  }]
}
```

The `important` key indicate if the _use-case_/_account_ is recommended or not.

The `default` key indicate if:

- the _use-case_ is the one displayed by default (_onboarding_ view)
- the _account_ into the list is the incentive one
