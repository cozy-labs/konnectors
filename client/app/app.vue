<template lang="pug">
    div(role="application")
        cozy-notif(v-for="item in notifications",
            v-bind:item="item")

        cozy-dialog(v-for="item in dialogs",
            v-bind:item="item",
            v-on:close="onCloseDialog",
            v-on:error="onErrorDialog",
            v-on:success="onSuccessDialog")

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
        headerImage: 'test0.png',
        content: ExampleKonnector,
        success: {
            route: { name: 'create-account-success' }
        }
    }]


    function getDialogsProp(query={}) {
        if (typeof query.dialogs === 'string')
            return query.dialogs.split(',').map((id) => {
                return Dialogs.find(item => item.id === id)
            }).filter(item => !!item)
        else
            return []
    }


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
          const to = this.$router.currentRoute

          // Show Dialog when component is created
          this.dialogs = getDialogsProp(to.query)
      },

      watch: {
          '$route' (to, from) {
              // Show or hide Dialog when route is updated
              this.dialogs = getDialogsProp(to.query)
          },

          dialogs (val, oldVal) {
              const dialogs = this.dialogsQuery

              // Update RouteQuery from dialogs values
              const oldQuery = this.$router.currentRoute.query
              const query = Object.assign({}, oldQuery, { dialogs })
              this.$router.push({ query })
          }
      },

      methods: {
          onOpenDialog (id) {
              const dialog = Dialogs.find(item => item.id === id)
              if (-1 === this.dialogs.indexOf(dialog)) {
                  this.dialogs.push(dialog)
              }
          },

          onCloseDialog (item) {
              const index = Dialogs.indexOf(item)
              this.dialogs = this.dialogs.splice(index, 0)
          },

          onSuccessDialog (item) {
              // Close Dialog
              this.onCloseDialog(item)

              // Goto NextComponent
              if (item.success && item.success.route) {
                  this.$router.push(item.success.route)
              }
          },

          // TODO: handle client errors
          // to display notifications
          onErrorDialog (err, item) {
              this.notifications.push({
                  type: 'error',
                  label: err
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
