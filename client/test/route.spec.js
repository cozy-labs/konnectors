'use strict'

import { assert } from 'chai'
import routes from '../app/routes'


describe('Routes', () => {

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
