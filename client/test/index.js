"use strict";

import jsdomGlobal from 'jsdom-global'
let jsdom = jsdomGlobal()

import Vue from 'vue'
import VueRouter from 'vue-router'
import VuePolyglot from '../app/plugins/vue-polyglot'

Vue.use(VueRouter)
Vue.use(VuePolyglot)

import App from '../app/app.vue'


describe('Routes', () => {

  describe('Discovery', () => {
    it('Should be default route', () => { })
    it('Should be into markup', () => { })
    it('Should redirect to `/discovery`', () => { })
  })

  describe('Categories', () => {
    it('Should be into markup', () => { })
    it('Should redirect to `/category`', () => { })
  })

  describe('Connected', () => {
    it('Should be into markup', () => { })
    it('Should redirect to `/connected`', () => { })
  })
})
