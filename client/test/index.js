'use strict'

import { assert } from 'chai';

import mockery from 'mockery'


describe('Routes', () => {

  let routes;


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
    let route;

    before(() => {
      route = routes.find((obj) => { return '/discovery' === obj.path })
    })


    it('Should exist', () => {
      assert(route)
      assert.deepEqual({}, route.component)
    })

    it('Should be `default` route', () => {
      assert.deepEqual('/', route.alias)
    })

  })


  describe('Categories', () => {
    let route;

    before(() => {
      route = routes.find((obj) => { return '/category' === obj.path })
    })


    it('Should exist', () => {
      assert(route)
      assert.deepEqual({}, route.component)
    })

  })


  describe('Connected', () => {
    let route;

    before(() => {
      route = routes.find((obj) => { return '/connected' === obj.path })
    })


    it('Should exist', () => {
      assert(route)
      assert.deepEqual({}, route.component)
    })

  })

})
