'use strict'

import { assert } from 'chai'
import mockery from 'mockery'


describe('Routes', () => {

  let routes


  before(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false
    })

    // Components are useless here
    mockery.registerMock('./components/discovery_list', {})
    mockery.registerMock('./components/category_list', {})
    mockery.registerMock('./components/connected_list', {})

    routes = require('../app/routes').default
  })


  after(() => {
    mockery.disable()
  })


  describe('Discovery', () => {
    let route

    before(() => {
      route = routes.find((obj) => { return '/discovery' === obj.path })
    })


    it('Should exist', () => {
      assert.isOk(route)
    })
  })


  describe('Categories', () => {
    let route

    before(() => {
      route = routes.find((obj) => { return '/category' === obj.path })
    })


    it('Should exist', () => {
      assert.isOk(route)
    })
  })


  describe('Connected', () => {
    let route

    before(() => {
      route = routes.find((obj) => { return '/connected' === obj.path })
    })


    it('Should exist', () => {
      assert.isOk(route)
    })
  })


  describe('Root redirection', () => {
    let route

    before(() => {
      route = routes.find((obj) => { return '/' === obj.path })
    })

    it('Should redirect to /discover', () => {
      assert.isOk(route)
      assert.equal(route.redirect, '/discovery')
    })
  })
})
