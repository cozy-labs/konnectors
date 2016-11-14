<template lang="pug">
    extends ../templates/layout.pug

    block content
        cozy-dialog(v-for="item in dialogs", v-bind:item="item", v-on:success="onSuccess", v-on:error="onError", v-on:submit="onSubmit", v-on:close="onCloseDialog")

        h1 {{ 'my_accounts category title' | t }}
        article {{ 'my_accounts coming_soon' | t }}

        ul
            li(v-for="link in links")
                button(v-on:click="onOpenDialog()")
                  | {{ link.message }}
</template>

<script>
    const dialogs = [{
        id: 'dialog-1',
        hidden: false,
        headerImage: 'test0.png',
        success: 'create-account-success',
        error: 'create-account-error'
    }]

    export default {
        data () {
            return {
                dialogs: [],
                links: [
                  { message: 'open dialog' }
                ]
            }
        },


        methods: {
            onOpenDialog (item) {
                if (item === undefined) {
                    item = dialogs[0]
                }

                // Show <dialog>
                this.dialogs.push(item)

                // Update URL query
                this.$router.push({ query: { dialog: item.id }})
            },


            onCloseDialog (item) {
                // Hide <dialog>
                const index = this.dialogs.indexOf(item)
                this.dialogs = this.dialogs.splice(index, 0)

                // Update URL query
                this.$router.push({ query: {}})
            },


            onError ({item, err}) {
                this.$router.push({ query: { notif: item.error } })
                return false
            },


            onSuccess ({item, result}) {
                this.$router.push({ query: { notif: item.success } })
                return true
            },


            onSubmit ({item, data}) {
                const validate = (item, data) => {
                    // Add specific validation here
                    // and call it into submit form
                    // return error if exists
                    // otherwise return nothing
                }

                const err = validate(item, data)
                if (err) {
                    this.onError({item, err})
                    return false
                } else {
                    this.onSuccess({item, result: true })
                    return true
                }
            }


        }

    }
</script>
