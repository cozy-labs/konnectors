<template lang="pug">
    div(aria-hidden="false" role="dialog")
        div(role="separator" @click="close")
        .wrapper
            div(role="contentinfo")
                header(:style="headerStyles")
                    a(:href="closeURL" @click="close" role="close")
                        | Close

                    slot(name="header")

                main: slot

                footer
                    slot(name="footer")
</template>

<script>
    import Vue from 'vue'

    export default {
        props: ['id', 'headerStyles', 'hub'],

        created () {
            this.hub.$on('close', this.close)
            this.hub.$on('success', this.success)
            this.hub.$on('error', this.error)
        },

        computed: {
            closeURL () {
                let query = []

                for (let name in this.closeQuery) {
                    query.push(`${name}=${this.closeQuery[name]}`)
                }

                if (query.length) {
                    return `#${this.$route.path}?${query.join('&')}`
                } else {
                    return `#${this.$route.path}`
                }
            },

            closeQuery () {
                const query = Object.assign({}, this.$router.currentRoute.query)
                const dialogs = query.dialogs.split(',')

                // Remove dialog from query
                const index = dialogs.indexOf(this.id)
                dialogs.splice(index, 1)

                // Update or remove dialog query
                if (!dialogs.length) {
                    delete query.dialogs
                } else {
                    query.dialogs = dialogs.join(',')
                }

                return query
            }
        },

        methods: {
            close () {
                const query = this.closeQuery
                this.$router.push({ query })

                // Bubbling `close` event
                this.$emit('close', this.id)
            },

            error (err) {
                // Bubbling `error` event
                this.$emit('error', err, this.id)
            },

            success () {
                // Bubbling `success` event
                this.$emit('success', this.id)
            }
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
