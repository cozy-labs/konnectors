'use strict'

import { assert } from 'chai'

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
    })


    describe('methods', () => {
      describe('`updateDialogs()` ', () => {

        beforeEach(() => {
          createApp()

          dialogs = 'truc'
          vm.updateDialogs({ query: dialogs })
        })

        afterEach(() => {
          destroyApp()
        })


        it('should update `vm.dialogs', () => {
          expect(vm.dialogs).toBe([dialogs])
        })


        it('should update `vm.query`', () => {
          expect(vm.dialogsQuery).toBe(`dialogs=${dialogs}`)
        })


        it('should update `vm.$router.currentRoute`', () => {
          expect(vm.$router.currentRoute.query).toBe(vm.dialogsQuery)
        })

      })


      describe('`onOpenDialog` ', () => {
        const dialog

        beforeEach(() => {
          createApp()

          dialog = 'plop'
          vm.onOpenDialog(dialog)
        })

        afterEach(() => {
          destroyApp()
        })


        it('`dialogQuery` should be equal to `dialogs=plop`', () => {
          expect(vm.dialogsQuery).toBe(`dialogs=${dialogs}`)
        })


        it('`vm.$router.currentRoute` should be updated ', () => {
          expect(vm.$router.currentRoute.query).toBe(vm.dialogsQuery)
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


    describe('Use Cases', () => {

      describe('Routing', () => {
        beforeEach(() => {
          createApp()
        })

        afterEach(() => {
          destroyApp()
        })


        describe('location/?dialogs=plop', () => {
            beforeEach(() => {
              dialogs = 'plop'
              this.$router.push({ query: { dialogs: dialogs } })
            })


            it('should update `dialogs`', () => {
              expect(vm.dialogs).toBe([dialogs])
            })


            it('should update `dialogsQuery`', () => {
              expect(vm.dialogsQuery).toBe(`dialogs=${dialogs}`)
            })
        })
      })


      describe('Click on `showDialog` button', () => {
        it('should open `dialogVue`', () => {

        })
      })


      describe('Click on `closeDialog` button', () => {
        it('should close `dialogVue`', () => {

        })
      })


      describe('Click on `success` button', () => {
        it('should display a `success` notif', () => {

        })
      })


      describe('Click on `error` button', () => {
        it('should display a `error` notif', () => {

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
})
