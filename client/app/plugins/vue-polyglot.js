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


const init = function () {
  const polyglot = new Polyglot({
    phrases: en,
    locale: 'en'
  })

  const lang = document.documentElement.getAttribute('lang')

  if (lang && lang != 'en') {
    try {
      const dict = require(`../locales/${lang}`)
      polyglot.extend(dict)
      polyglot.locale(lang)
    } catch (e) {
      console.error(`The requested dict phrases for "${lang}" cannot be loaded`)
    }
  }

  return polyglot
}


export default {
  install (Vue) {
    const polyglot = init()

    Vue.prototype.$t = polyglot.t.bind(polyglot)
    Vue.filter('t', Vue.prototype.$t)
  }
}
