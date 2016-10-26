Cozy Konnectors client-side app architecture
============================

Current state
-------------

- CoffeeScript codebase
- Backbone app
- Simple structure
- Oignon architecture
- Hard-coded templates structures (low flexibility)
- Nested styles
- Bugged realtime
- Not a core to power konnectors, but not a full opionated plateform


Should we keep it?
------------------

### Pros

- it exists
- it is used for dozen of konnectors
- it doesn't need particular skills about the plateform to add a Konnector
- it uses a well-known architecture (just a Backbone with some custom base views)


### Cons

- unmaintainable in long-term (markups in views, too deeply nested concerns…)
- need to revamp all styles and a huge part of markups
- doesn't offer enough flexibility to build views
- adding features (like OAuth) will be difficult due to hard-coded behaviors
- realtime isn't sufficiently sustainable (takes place at root instead of being dedicated to components it relies on)

### Recommendation

As the app isn't really complicated, and because we wanted to reconsider the way we display / manage / add features to konnectors, we recommand to trash the actual version of the client-side app, and start a fresh new one. The actual code is too deeply messy to be really sustainable in future, and doesn't let community easily add features.


Architecture
------------

### Overview

The konnector client-side app should provides the following features:

- a dedicated core to power konnectors as autonomous entities
- a set of useful components to build konnectors views (username, password, directory-select, tokens…)
- a default view for basic konnectors (username / password / directory-target)
- keep each konnector separated from the core
- a minimalist API to interact with core features (e.g. to submit / validate form)
- an easy way to override default behaviors (logics, views, styles…) for a given konnector


### Technical recommendation

We suggest to build the new version of Konnector client-side app in [ES2015 (ES6)](https://babeljs.io/docs/learn-es2015/), using [_Vue.js_](https://vuejs.org/guide/) with [_vue-router_](https://router.vuejs.org/en/index.html) and [_vue-resource_](https://github.com/vuejs/vue-resource) for the app logics, and [Webpack](https://webpack.github.io/docs/) for the packaging tool along the [_vue-loader_](http://vue-loader.vuejs.org/en/index.html) webpack's loader.

Vue.js is a frontend reactive framework useful to build good shaped interfaces and is built with design in mind. It doesn't need any complicated source logics (such as immutables sources, stores, etc) and instead keep focused on how to design components efficiently. Vue-router is its attached routing library, which makes URL based Ui really simple to develop.

The Components approch of Vue.js, and its native filtering capabilities makes it a good candidate to build the new Konnectors Ui. It lets separate:

- Main collection views (wizard, categories, configured konnectors…)
- Ui components (input fields, secured fields, directory-selectors, interval-timer…)
- Informational subview (what does this konnector do?)
- Configuration subview, which can be fully configured from the server side, or us a default template if none is provided

A clever approach furbished by Vue.js ecosystem is the _vue-loader_ webpack's loader: it allows to  wrap in a single file all the needs to a dedicated component: template (markup), styles, and JS logics. This will allow community developers that need to create a custom component to wrap in one place all their behaviors, which will simplify contribution and maintenance, and will bring much more flexibility when we want to add features.


### Core API

The core will provide to each konnector component a set of methods (a minimal API) which allow it to interact with the functionnalities it needs. Those methods can be invoked using the `$emit` call (plus args) from the konnector component:

#### `save`

Send the data for the model to be saved.


#### `validate`

Ask the model to validate given data. Returns errors via `props`.


#### `reset`

Force the model to reset its data to default.


#### `delete`

Remove the model from the configured konnectors collection.


### Components

The core should provide a set of components ready to be used by konnectors:

- input field
- username field
- password field
- directory selector
- interval timer selector
- configurable selector
- date picker


### Default konnector view

The default konnector view, which can be used by any konnector which doesn't need any custom form will provide the following fields:

- username
- password
- directory
- timer


### Custom views

If the konnector developer need a more customized template, it can be configured inside the konnector itself and served by the stack behind an endpoint, in JSON configuration format.

On the client-side, it means a konnector view is a generic view which loop on configured fields as served from the endpoint, and then build dynamically the template, using the reserved `<component :is="username" />` element syntax.


### Collections views

The collections views (available konnectors, categories, configured…) can easily be handled using the filtering built-in capabilities in Vue.js.
