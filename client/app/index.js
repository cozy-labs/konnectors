import Vue from 'vue'
import VueRouter from 'vue-router'
import VuePolyglot from './plugins/vue-polyglot'

import Dialog from './components/dialog'
import Notification from './components/notification'

import app from './app'
import routes from './routes'

// Initialize Vue
Vue.use(VueRouter)
Vue.use(VuePolyglot, { context: window.context || 'cozy' })

// Initialize Vue-router
const router = new VueRouter({ routes })

// Initialize Application
document.addEventListener('DOMContentLoaded', function initialize () {

  Vue.component('cozy-dialog', Dialog)
  Vue.component('cozy-notif', Notification)

  new Vue({
    router,
    render: h => h(app)
  }).$mount('[role=application]')
})
