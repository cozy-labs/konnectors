<template lang="pug">
    div(role="application")
        cozy-notif(v-for="item in notifications",
            :item="item")

        cozy-dialog(v-for="dialog in dialogs",
            :id="dialog.id",
            :headerStyles="dialog.headerStyles",
            :hub="dialog.hub",
            @close="onCloseDialog",
            @error="onErrorDialog",
            @success="onSuccessDialog")

            h3(slot="header") {{ dialog.title }}

            component(:is="dialog.component")

            ul(slot="footer")
                li: button(@click="dialog.hub.$emit('error', 'this is a notification error')") Error
                li: button(@click="dialog.hub.$emit('close')") Cancel
                li: button(@click="dialog.hub.$emit('success')") Next

        aside
            h4 {{ 'my_accounts title' | t }}
            ul(role="navigation")
                li
                    router-link(to="/discovery")
                        svg: use(:xlink:href="require('./assets/sprites/icon-discovery.svg')")
                        | {{ 'my_accounts discovery title' | t }}

                li
                    router-link(to="/category")
                        svg: use(:xlink:href="require('./assets/sprites/icon-category.svg')")
                        | {{ 'my_accounts category title' | t }}

                li
                    router-link(to="/connected")
                        svg: use(:xlink:href="require('./assets/sprites/icon-connected.svg')")
                        | {{ 'my_accounts connected title' | t }}

        router-view(v-on:open-dialog='onOpenDialog')

</template>


<script>
    import Vue from 'vue'

    import DialogComponent from './components/dialog'
    import NotifComponent from './components/notification'

    import ExampleKonnector from './components/konnectors/example'

    //
    // Handle use case:
    // when adding real dialogs this declaration
    // will be very obscure and un-readable
    //
    // TODO:
    // create a directory `./config/myDialog.js`
    // and then import it into (Array)Dialogs
    //
    const Dialogs = [{
        id: 'dialog-1',

        title: "dialog title",

        headerStyles: {
            'background-image': `url(header.png)`,
            'height': '100px'
        },

        component: ExampleKonnector,

        routes: {
            success: { name: 'create-account-success' }
        },

        // Handle Events emitted
        // from dialogsVue to appVue
        hub: new Vue()
    }]


    export default {
      data () {
          return {
              dialogs: [],
              notifications: []
          }
      },

      computed: {
          dialogsQuery: {
              get () {
                  let values = this.dialogs.map(item => item.id)

                  // Do not show dialogs query when empty
                  // avoid [].join(',') that leads to dialogs=''
                  if (values.length) values = values.join(',')

                  return values
              }
          }
      },

      components: {
          'cozy-dialog': DialogComponent,
          'cozy-notif': NotifComponent
      },

      created () {
          this.updateDialogs(this.$router.currentRoute)
      },

      watch: {
          '$route': 'updateDialogs'
      },

      methods: {
          updateDialogs (to) {
              const dialogs = to.query.dialogs

              if (typeof dialogs === 'string')
                  // Check if query have a configuration
                  // if none do not it save into dialogs
                  this.dialogs = dialogs.split(',').map((id) => {
                      return Dialogs.find(item => item.id === id)
                  }).filter(item => !!item)
              else
                  this.dialogs = []
          },

          onOpenDialog (id) {
              let dialogs = this.$router.currentRoute.query.dialogs || null
              const query   = Object.assign({}, this.$router.currentRoute.query)

              if (dialogs) {
                  dialogs = dialogs.split(',')
                  if (-1 === dialogs.indexOf(id))
                      query.dialogs = dialogs.concat([id]).join(',')
              } else {
                  query.dialogs = id
              }

              this.$router.push({ query })
          },

          onCloseDialog (id) {
              // Close Notifications
              // related to this item
              this.onCloseNotif(id)
          },

          onSuccessDialog (id) {
              // Close Dialog
              this.onCloseDialog(id)

              // Goto NextComponent
              const dialog = Dialogs.find(item => item.id === id)
              if (dialog && dialog.routes.success) {
                  this.$router.push(dialog.routes.success)
              }
          },

          onErrorDialog (err, id) {
              this.onOpenNotif(err, id)
          },

          onOpenNotif (err, id) {
              this.notifications.push({
                  type: 'error',
                  label: err,
                  dialog: id
              })
          },

          onCloseNotif (id) {
              this.notifications = this.notifications.filter((notif) => {
                  return notif.dialog !== id
              })
          }
      },
    }
</script>


<style lang="stylus">
    @import '../node_modules/normalize.css/normalize.css'
    @import './styles/base/_normalize'
    @import './styles/base/_colors'

    @import 'cozy-ui'

    [role=application]
        @extend $app-2panes-toolbar
        background-color: $grey-01-alpha

        main
            padding: 2.5em 3em

        h1
            font-size: 2em
            margin: 0 0 1em


    aside
        background-color: $grey-01
        box-shadow: inset -1px 0 0 0 $grey-01-alpha

        h4
            font-weight: normal
            font-size: 1.5em
            padding: 1em 1.5em
            margin: 0


    [role="navigation"]
        li
            display: flex
            flex-direction: row

        a
            text-decoration: none
            color: $red
            flex: 1
            padding: 1em 1.5em
            margin: 0.25em 0

            &:hover:not(.router-link-active)
                background-color: $grey-01-alpha

        .router-link-active
            background-color: $red
            color: white

            svg
                path
                    fill: white

        svg
            width: 1.5em
            height: 1.5em
            margin-right: 0.5em
            display: inline-block
            vertical-align: middle
</style>
