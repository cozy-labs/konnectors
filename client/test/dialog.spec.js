'use strict'

import { assert } from 'chai'

import Vue from 'vue'
import App from '../app/app'


describe('Dialogs', () => {
  it('`dialogs` should be equal to []', () => {
    //console.log(App.data())
    //assert.isOk(true)
  })

  it('`notifications` should be equal to []', () => {

  })

  describe('`dialogsQuery` ', () => {
    it('should return `\'\'` for `dialogs=[]`', () => {

    })

    it('should return `dialogs=plop` for `dialogs=[plop]`', () => {

    })
  })


  // updateDialogs(to)
  describe('`updateDialogs` ', () => {
    it('should be called when App is created`', () => {

    })


    it('should be called when route changes', () => {

    })

    // Update from Route behavior
    describe('`data.dialogs` ', () => {
      it('should be equal to `[]` when no dialog query exist', () => {

      })


      it('should be equal to `[plop]` when `?dialogs=plop`', () => {

      })
    })
  })


  describe('`onOpenDialog` ', () => {
    it('this.dialogQuery should be equal to `dialogs=plop`', () => {
      // prévoir plusieurs ajouts à la suite;
      // ne pas avoir plusieurs fois le même param dans la query
    })
  })


  describe('`onCloseDialog` ', () => {
    it('should call `onOpenNotif`', () => {

    })
  })


  describe('`onSuccessDialog` ', () => {
    it('should close current dialog', () => {

    })


    it('should redirect to config.success', () => {

    })
  })


  describe('`onErrorDialog` ', () => {
    it('should call onOpenNotif with `err` and `id` args', () => {

    })
  })


  describe('`onOpenNotif` ', () => {
      describe('`notifications` ', () => {
        it('should be equal to `[{ err, label, dialog }]`', () => {

        })
      })
  })


  describe('`onCloseNotif` ', () => {
    describe('`notifications` ', () => {
      it('shouldnt have values from `dialog` anymore', () => {

      })
    })
  })
})
