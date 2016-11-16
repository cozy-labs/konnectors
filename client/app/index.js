import Vue from 'vue'
import VueRouter from 'vue-router'
import VuePolyglot from './plugins/vue-polyglot'

import app from './app'
import routes from './routes'

// Initialize Vue
Vue.use(VueRouter)
Vue.use(VuePolyglot, { context: window.context || 'cozy' })

// Initialize Vue-router
const router = new VueRouter({ routes })

// Initialize Application
document.addEventListener('DOMContentLoaded', function initialize () {

  new Vue({
    router,
    render: h => h(app)
  }).$mount('[role=application]')
})
