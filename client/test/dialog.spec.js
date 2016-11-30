'use strict'

import { assert } from 'chai'

import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

Vue.use({
  install (Vue) {
    Vue.prototype.$t = text => text
    Vue.filter('t', Vue.prototype.$t)
  }
}, { context: 'cozy' })

const App = require('../app/app')
const Dialog = require('../app/components/dialog')

describe('Dialogs', () => {

  describe('App.vue', () => {
    let vm

    const dialogsConfig = [{
            id: 'plop',
            Routes: { success: { name: 'plop-success' } }
        },{
            id: 'burp',
            Routes: { success: { name: 'burp-success' } }
        },{
            id: 'truc',
            Routes: { success: { name: 'burp-success' } }
        }]

    function createApp (mocks) {
      const AppInjector = require('!!vue?inject!../app/app')
      const AppWithMocks = AppInjector({
        './config/dialog_example': dialogsConfig
      })

      vm = new Vue({
        template: '<div><test></test></div>',
        router: new VueRouter(),
        components: {
          'test': AppWithMocks
        }
      }).$mount()
    }

    function destroyApp () {
      vm.$destroy()
    }


    describe('data', () => {
      it('`dialogs` should be equal to []', () => {
        assert.deepEqual(App.data().dialogs, [])
      })


      it('`notifications` should be equal to []', () => {
        assert.deepEqual(App.data().notifications, [])
      })


      it('`dialogsQuery` should return `\'\'` for `dialogs=[]`', () => {
        assert.deepEqual(App.data().dialogs, [])
        assert.deepEqual(App.computed.dialogsQuery.get.call(App.data()), [])
      })
    })


    describe('methods', () => {

      before(() => {
        createApp()
      })

      after(() => {
        destroyApp()
      })

      describe('`updateDialogs()` ', () => {

        afterEach(() => {
          vm.$children[0].updateDialogs({ query: {} })
        })


        describe('with value that exist', () => {

          beforeEach(() => {
            vm.$children[0].updateDialogs({ query: { dialogs: 'burp' } })
          })


          it('should update `vm.dialogs`', () => {
            const output = dialogsConfig.find(item => item.id === 'burp')
            assert.deepEqual(vm.$children[0].dialogs, [output])
          })


          it('should update `vm.dialogsQuery`', () => {
            assert.deepEqual(vm.$children[0].dialogsQuery, 'burp')
          })
        })


        describe('with `undefined` value', () => {

          beforeEach(() => {
            vm.$children[0].updateDialogs({ query: { dialogs: 'coucou' } })
          })


          it('shouldnt update `vm.dialogs`', () => {
            assert.deepEqual(vm.$children[0].dialogs, [])
          })


          it('shouldnt update `vm.dialogsQuery`', () => {
            assert.deepEqual(vm.$children[0].dialogsQuery, [])
          })
        })
      })


      describe.skip('`onOpenDialog` ', () => {

        beforeEach(() => {
          vm.onOpenDialog('plop')
        })

        it('`dialogQuery` should be equal to `dialogs=plop`', () => {
          assert.equal(vm.dialogsQuery, `dialogs=plop`)
        })


        it('`vm.$router.currentRoute` should be updated ', () => {
          assert.equal(vm.$router.currentRoute.query, vm.dialogsQuery)
        })
      })


      describe.skip('`onCloseDialog` ', () => {

        beforeEach(() => {
          vm.onOpenDialog('plop')
        })


        it('should call `onOpenNotif` with `id` as 1rst args', () => {
          sinon.spy(vm, 'onOpenNotif')

          vm.onCloseDialog('plop')
          assert(spy.calledOnce)
          assert(spy.calledWithExactly('plop'))

          vm.onOpenNotif.restore()
        })
      })


      describe.skip('`onSuccessDialog` ', () => {
        let dialog

        beforeEach(() => {
          dialog = vm.config.find(item => item.id === 'burp')
          vm.onOpenDialog('burp')
        })


        it('should call `onCloseDialog` with `id` as 1rst args', () => {
          sinon.spy(vm, 'onCloseDialog')

          vm.onSuccessDialog('burp')
          assert(spy.calledOnce)
          assert(spy.calledWithExactly('burp'))

          vm.onCloseDialog.restore()
        })


        it('should redirect to `dialog.success`', () => {
          assert.equal(vm.$router.currentRoute.name, dialog.success)
        })


        it('should call `onOpenNotif` with `msg` and `id` args', () => {
            sinon.spy(vm, 'onOpenNotif')

            vm.onSuccessDialog('burp')
            assert(spy.calledOnce)
            assert(spy.calledWithExactly('burp'))

            vm.onOpenNotif.restore()
        })


        it('shouldnt call `onOpenNotif`', () => {
          delete dialog.success

          sinon.spy(vm, 'onOpenNotif')

          vm.onSuccessDialog('burp')
          assert.equal(spy.callCount, 0)

          vm.onOpenNotif.restore()
        })
      })


      describe.skip('`onErrorDialog` ', () => {
        it('should call `onOpenNotif` with `msg` and `id` args', () => {
          sinon.spy(vm, 'onOpenNotif')

          vm.onErrorDialog('msg error', 'burp')
          assert(spy.calledOnce)
          assert(spy.calledWithExactly('msg error', 'burp'))

          vm.onOpenNotif.restore()
        })
      })


      describe.skip('`onOpenNotif` ', () => {
        it('`notifications` should be equal to `[{ msg, label, dialog }]`', () => {
          const result = {
            dialog: 'burp',
            label: 'msg error',
            type: 'error'
          }

          vm.onOpenNotif('msg error', 'burp')
          assert.equal(vm.notifications.indexOf(result, 0))
        })
      })


      describe.skip('`onCloseNotif` ', () => {
        it('`notifications` shouldnt have values from `dialog` anymore', () => {
          const result = {
            dialog: 'burp',
            label: 'msg error',
            type: 'error'
          }

          vm.onOpenNotif('msg error', 'burp')
          assert.equal(vm.notifications.indexOf(result), 0)

          vm.onCloseNotif('msg error', 'burp')
          assert.equal(vm.notifications.indexOf(result), -1)
        })
      })
    })


    describe('Routing', () => {
    // shouldnt add fakeQuery
      describe.skip('location', () => {
          it.skip('shouldnt have `dialogs` query', () => {

          })
      })

      describe.skip('location/?dialogs=undefined', () => {
          it.skip('shouldnt add fakeQuery', () => {

          })
      })

      describe.skip('location/?dialogs=plop', () => {
        beforeEach(() => {
          createApp()
          vm.$router.push({ query: { dialogs: 'plop' } })
        })

        afterEach(() => {
          destroyApp()
        })


        it.skip('should update `dialogs`', () => {
          assert.equal(vm.dialogs, ['plop'])

          // Do not add dialog into query
          // if it already exists
          vm.$router.push({ query: { dialogs: 'plop' } })
          assert.equal(vm.dialogs, ['plop'])
        })


        it.skip('should update `dialogsQuery`', () => {
          assert.equal(vm.dialogsQuery, `dialogs=plop`)
        })
      })
    })


    describe.skip('Markup', () => {

      beforeEach(() => {
        createApp()
        vm.config = [{ id: 'plop' }, { id: 'truc' }]
      })

      afterEach(() => {
        destroyApp()
      })


      describe.skip('Dialogs', () => {

        it('shouldnt have any <cozy-dialogs>', () => {
          const notifs = vm.$el.querySelectorAll('role="notification"')
          assert.equal(notifs.length, 0)
        })


        it('should have 2 <cozy-dialog> when `vm.dialogs.length == 2`', () => {
          vm.dialogs.push({ id: 'plop' })
          vm.dialogs.push({ id: 'truc' })

          const dialogs = vm.$el.querySelectorAll('div role="dialog"')
          assert.equal(dialogs.length, 2)
        })


        it('should remove <cozy-dialog> if dialogs is reset', () => {
          vm.dialogs.push({ id: 'plop' })
          assert.equal(vm.$el.querySelectorAll('div role="dialog"').length, 1)

          vm.dialogs = []
          assert.equal(vm.$el.querySelectorAll('div role="dialog"').length, 0)
        })


        it('shouldnt have <cozy-dialog> when query doesnt belongs to `vm.config`', () => {
          vm.dialogs.push({ id: 'test' })

          const dialogs = vm.$el.querySelectorAll('div role="dialog"')
          assert.equal(dialogs.length, 0)
        })
      })


      describe.skip('Notifications', () => {

          it('shouldnt have any <cozy-notif>', () => {
            const notifs = vm.$el.querySelectorAll('role="notification"')
            assert.equal(notifs.length, 0)
          })


          it('should have 3 <cozy-notif> when `vm.notifications.length == 3`', () => {
            vm.notifications.push({ id: 'notif 1' })
            vm.notifications.push({ id: 'notif 2' })
            vm.notifications.push({ id: 'notif 3' })

            const notifs = vm.$el.querySelectorAll('role="notification"')
            assert.equal(notifs.length, 3)
          })
      })

    })
  })


  describe.skip('Dialog.vue', () => {
    let vm

    function createDialog () {
      vm = new Vue({
        template: '<div><test></test></div>',
        components: {
          'test': Dialog
        }
      }).$mount()
    }

    function destroyDialog () {
      vm.$destroy()
    }


    describe('props', () => {
      it('should have `id` property', () => {

      })

      it('should have `headerStyles` property', () => {

      })

      it('should have `hub` property', () => {

      })
    })


    describe('computed', () => {
      describe('closeURL', () => {

      })

      describe('closeQuery', () => {

      })
    })


    describe('methods', () => {
      describe('close', () => {

      })

      describe('error', () => {

      })

      describe('success', () => {

      })
    })
  })
})
