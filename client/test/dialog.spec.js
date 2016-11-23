'use strict'

import { assert } from 'chai'
import sinon from 'sinon'

import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import App from '../app/app'


describe('Dialogs', () => {
  const vm
  const dialogs

  const createApp = () => {
    vm = new Vue({
      template: '<div><test></test></div>',
      components: {
        'test': App
      }
    }).$mount()
  }

  const destroyApp = () => {
    vm.$destroy()
  }

  describe('App.vue', () => {

    describe('data', () => {
      describe('`dialogs` should be equal to []', () => {
        expect(App.data().dialogs).toBe([])
      })

      it('`notifications` should be equal to []', () => {
        expect(App.data().notifications).toBe([])
      })

      it('`dialogsQuery` should return `\'\'` for `dialogs=[]`', () => {
        expect(App.data().dialogs).toBe([])
        expect(App.computed.dialogsQuery.get()).toBe('')
      })

      it('`dialogsQuery` should return `\'\'` for `dialogs=[]`', () => {
        expect(App.data().dialogs).toBe([])
        expect(App.computed.dialogsQuery.get()).toBe('')
      })
    })


    describe('methods', () => {

      beforeEach(() => {
        createApp()

        vm.config = [{
            id: 'plop',
            routes: { success: { name: 'plop-success' } }
        },{
            id: 'burp',
            routes: { success: { name: 'burp-success' } }
        },{
            id: 'truc',
            routes: { success: { name: 'burp-success' } }
        }]
      })

      afterEach(() => {
        destroyApp()
      })

      describe('`updateDialogs()` ', () => {

        beforeEach(() => {
          vm.updateDialogs({ query: 'truc' })
        })


        it('should update `vm.dialogs', () => {
          expect(vm.dialogs).toBe(['truc'])
        })


        it('should update `vm.query`', () => {
          expect(vm.dialogsQuery).toBe(`dialogs=truc`)
        })


        it('should update `vm.$router.currentRoute`', () => {
          expect(vm.$router.currentRoute.query).toBe(vm.dialogsQuery)
        })

      })


      describe('`onOpenDialog` ', () => {

        beforeEach(() => {
          vm.onOpenDialog('plop')
        })

        it('`dialogQuery` should be equal to `dialogs=plop`', () => {
          expect(vm.dialogsQuery).toBe(`dialogs=plop`)
        })


        it('`vm.$router.currentRoute` should be updated ', () => {
          expect(vm.$router.currentRoute.query).toBe(vm.dialogsQuery)
        })
      })


      describe('`onCloseDialog` ', () => {

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


      describe('`onSuccessDialog` ', () => {
        const dialog

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
          expect(vm.$router.currentRoute.name).toBe(dialog.success)
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


      describe('`onErrorDialog` ', () => {
        it('should call `onOpenNotif` with `msg` and `id` args', () => {
          sinon.spy(vm, 'onOpenNotif')

          vm.onErrorDialog('msg error', 'burp')
          assert(spy.calledOnce)
          assert(spy.calledWithExactly('msg error', 'burp'))

          vm.onOpenNotif.restore()
        })
      })


      describe('`onOpenNotif` ', () => {
        it('`notifications` should be equal to `[{ msg, label, dialog }]`', () => {
          const result = {
            dialog: 'burp',
            label: 'msg error',
            type: 'error'
          }

          vm.onOpenNotif('msg error', 'burp')
          expect(vm.notifications.indexOf(result).toBe(0))
        })
      })


      describe('`onCloseNotif` ', () => {
        describe('`notifications` ', () => {
          it('shouldnt have values from `dialog` anymore', () => {
            const result = {
              dialog: 'burp',
              label: 'msg error',
              type: 'error'
            }

            vm.onOpenNotif('msg error', 'burp')
            expect(vm.notifications.indexOf(result)).toBe(0)

            vm.onCloseNotif('msg error', 'burp')
            expect(vm.notifications.indexOf(result)).toBe(-1)
          })
        })
      })
    })


    describe('Routing', () => {

      describe('location/?dialogs=plop', () => {
          beforeEach(() => {
            createApp()
            vm.$router.push({ query: { dialogs: 'plop' } })
          })

          afterEach(() => {
            destroyApp()
          })


          it('should update `dialogs`', () => {
            expect(vm.dialogs).toBe(['plop'])

            // Do not add dialog into query
            // if it already exists
            vm.$router.push({ query: { dialogs: 'plop' } })
            expect(vm.dialogs).toBe(['plop'])
          })


          it('should update `dialogsQuery`', () => {
            expect(vm.dialogsQuery).toBe(`dialogs=plop`)
          })
      })
    })
  })


  describe('Dialog.vue', () => {

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
