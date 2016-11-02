/**
 * Vue.js plugin that wrap AirBnB Polyglot lib in a Vue filter.
 *
 * Use it in your mustaches, with options if needed
 * (see http://airbnb.io/polyglot.js/#interpolation):
 *
 * ```html
 * <p>{{ 'key to translate' | t }}</p>
 * <p>{{ 'key that handle a var' | t({name: 'foo'}) }}
 * ```
 */

'use strict';

import Polyglot from 'node-polyglot'
import en from '../locales/en'


const init = function ({context}) {
  const polyglot = new Polyglot({
    phrases: en,
    locale: 'en'
  })

  const lang = document.documentElement.getAttribute('lang') || 'en'

  // Load global locales
  if (lang && lang != 'en') {
    try {
      const dict = require(`../locales/${lang}`)
      polyglot.extend(dict)
      polyglot.locale(lang)
    } catch (e) {
      console.error(`The dict phrases for "${lang}" can't be loaded`)
    }
  }

  // Load context locales
  if (context) {
    try {
      const dict = require(`../contexts/${context}/locales/${lang}`)
      polyglot.extend(dict)
    } catch (e) {
      console.error(`The dict phrases for context "${context}" can't be loaded`)
    }
  }

  return polyglot
}


export default {
  install (Vue, options) {
    const polyglot = init(options)

    Vue.prototype.$t = polyglot.t.bind(polyglot)
    Vue.filter('t', Vue.prototype.$t)
  }
}
