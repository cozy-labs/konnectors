import Vue from 'vue'
import VueRouter from 'vue-router'
import VuePolyglot from './plugins/vue-polyglot'

import app from './app'

import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

Vue.use(VueRouter)
Vue.use(VuePolyglot)


const routes = [
  {
    path: '/category',
    alias: '/',
    component: CategoryList
  },
  {
    path: '/discovery',
    component: DiscoveryList
  },
  {
    path: '/connected',
    component: ConnectedList
  }
]

const router = new VueRouter({ routes })


document.addEventListener('DOMContentLoaded', function initialize () {
  new Vue({
    router,
    render: h => h(app)
  }).$mount('[role=application]')
})
