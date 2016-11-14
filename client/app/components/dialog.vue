<template lang="pug">
    div(v-bind:aria-hidden="hidden", role="dialog")
        div(role='separator', v-on:click="onClose")
        .wrapper
            div(role='contentinfo')
                header(v-bind:style="headerStyles")
                    a(v-on:click="onClose", title='close') Close
                    block dialog_header
                        p dialog_header free content

                div
                    block dialog_content
                        p dialog free content

                footer
                    block dialog_footer
                        button(v-on:click="onClose", title='cancel')
                            | cancel
                        button(v-on:click="onSubmit", title='submit')
                            | next

</template>

<script>
    export default {
        props: ['item'],

        data () {
            return {
                hidden: false
            }
        },

        computed: {
            headerStyles: {
                get () {
                    const src = this.item.headerImage
                    return `background-image: url('${src}');`
                }
            }
        },

        beforeMount () {
            // Add query to URI
            const dialog = this.item.id
            this.$router.push({ query: { dialog }})
        },


        // Update URL query
        methods: {
            onClose () {
                const dialogs = this.$router.currentRoute.query.dialog.split(',')
                const index = dialogs.indexOf(this.item)

                // Update URL query
                const dialog = dialogs.splice(index, 0).map((item) => {
                    return item.id
                })
                this.$router.push({ query: { dialog } })

                // Bubbling `close` event
                this.$emit('close', { item: this.item })
            },

            onSubmit (err) {
                // Bubbling `submit` event
                this.$emit('submit', { item: this.item, data: this.data })
            },
        }
    }
</script>

<style lang="stylus">
    @import 'cozy-ui'
    [role=dialog]
        @extend $dialog

        [role=separator]
            cursor pointer
            background-color rgba(78, 91, 105, 0.75)

        .wrapper
            min-height 100vh
            padding 3em 1em
            box-sizing border-box

        [role=contentinfo]
            overflow initial
            flex-direction column
</style>
