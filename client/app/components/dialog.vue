<template lang="pug">
  cozy-dialog(v-if="content",
      v-bind:headerStyles="headerStyles",
      v-bind:onClose="onClose",
      v-bind:onSuccess="onSuccess")
</template>

<script>
    import Vue from 'vue'

    export default {
        props: ['item', 'content'],

        computed: {
            content () {
                Vue.component('cozy-dialog', this.item.content)
                return !!this.item.content
            },
            headerStyles () {
                const src = this.item.headerImage
                return `background-image: url('${src}');`
            }
        },

        // Update URL query
        methods: {
            onClose () {
                // Bubbling `close` event
                this.$emit('close', this.item)
            },

            onSuccess () {
                // Bubbling `success` event
                this.$emit('success', this.item)
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
