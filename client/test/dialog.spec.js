'use strict'

import { assert } from 'chai'

import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import App from '../app/app'


describe('Dialogs', () => {
  const vm
  const dialogs

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
          vm = new Vue({
            template: '<div><test></test></div>',
            components: {
              'test': App
            }
          }).$mount()

          dialogs = 'truc'
          vm.updateDialogs({ query: dialogs })
        })

        afterEach(() => {
          vm.$destroy()
        })


        it('should update `vm.dialogs', () => {
          expect(vm.dialogs).toBe([dialogs])
        })


        it('should update `vm.query`', () => {
          expect(vm.dialogsQuery).toBe(`dialogs=${dialogs}`)
        })


        it('should update `vm.$router.currentRoute`', () => {
          expect(this.$router.currentRoute.query).toBe(vm.dialogsQuery)
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


    describe('Use Cases', () => {

      describe('Routing', () => {
        beforeEach(() => {
          vm = new Vue({
            template: '<div><test></test></div>',
            components: {
              'test': App
            }
          }).$mount()
        })

        afterEach(() => {
          vm.$destroy()
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
