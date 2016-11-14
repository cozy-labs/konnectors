<template lang="pug">
    div(v-bind:aria-hidden="hidden", role="dialog")
        div(role='separator', v-on:click="onClose")
        .wrapper
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
        data () {
            return {
                hidden: false
            }
        },

        computed: {
            headerStyles: {
                get () {
                    const src = this.$vnode.data.attrs.item.headerImage
                    return `background-image: url('${src}');`
                }
            }
        },

        methods: {
            onClose () {
                const item = this.$vnode.data.attrs.item
                this.$emit('close', { item })
            },

            onSubmit (err) {
                const item = this.$vnode.data.attrs.item
                this.$emit('submit', { item, data: this.data })
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
