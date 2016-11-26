<template lang="pug">
    extends ../templates/layout.pug

    block content
        h1 {{ 'my_accounts category title' | t }}
        div.konnectors-list
            konnector-item(
                v-for="konnector in konnectorsList",
                v-if="!konnector.accounts.length",
                :title="konnector.name",
                :subtitle="konnector.category",
                :backgroundCSS="konnector.color.css",
                :enableDefaultIcon="true",
                :iconName="konnector.slug",
                link="#")
</template>

<script>
    import konnectorItemComponent from './list_item'

    export default {
        data: function () {
            return {
                konnectorsList: window.initKonnectors
            }
        },

        components: {
            'konnectorItem': konnectorItemComponent
        },

        methods: {
            openDialog () {
                this.$emit('open-dialog', 'dialog-1')
            }
        },
    }
</script>

<style lang="stylus">
    .konnectors-list
        display         flex
        flex-wrap       wrap
</style>
