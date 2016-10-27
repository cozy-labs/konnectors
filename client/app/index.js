import Vue from 'vue'
import VueRouter from 'vue-router'

import app from './app'

import foo from './components/examples/foo'
import bar from './components/examples/bar'

Vue.use(VueRouter)


const routes = [
    { path: '/foo', component: foo, alias: '/' },
    { path: '/bar', component: bar }
]

const router = new VueRouter({ routes })


document.addEventListener('DOMContentLoaded', function initialize () {
    new Vue({
        router,
        render: h => h(app)
    }).$mount('[role=application]')
})
