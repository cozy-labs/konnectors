<template lang="pug">
    div(role="application")
        cozy-dialog(v-for="item in dialogs",
            v-bind:item="item",
            v-on:close='onCloseDialog',
            v-on:submit='onSubmitDialog',
            v-on:success='onSuccess')

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
    const dialogs = [{
        id: 'dialog-1',
        headerImage: 'test0.png',
        success: {
            route: { name: 'create-account-success' }
        }
    }]


    export default {
      data() {
          return {
              'dialogs': []
          }
      },

      created () {
          const query = this.$router.currentRoute.query

          // Show Dialogs
          if (query.dialog) {
              const values = query.dialog.split(',')
              values.forEach((value) => {
                  this.onOpenDialog(value)
              })
          }
      },

      methods: {
          onError (err) {

          },

          onSuccess (item, success) {
              // Close Dialog
              this.onCloseDialog(item)

              // Goto NextComponent
              if (undefined !== success.route) {
                  this.$router.push(item.success.route)
              }
          },

          onOpenDialog (id) {
              // Get DialogConfig
              const item = dialogs.find((obj) => {
                  return id === obj.id
              })

              // Show <dialog>
              if (item) this.dialogs.push(item)
          },

          onCloseDialog ({item}) {
              // Hide <dialog>
              const index = this.dialogs.indexOf(item)
              this.dialogs = this.dialogs.splice(index, 0)
          },

          onSubmitDialog ({data, item, success}) {
              const validate = (item, data) => {
                  // Add specific validation here
                  // and call it into submit form
                  // return error if exists
                  // otherwise return nothing
              }

              const err = validate(item, data)
              if (err) {
                  this.onError(err)
                  return false

              } else {
                  this.onSuccess(item, item.success)
                  return true
              }
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
