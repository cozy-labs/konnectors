<template lang="pug">
cozy-dialog

    h3(slot="header") {{ dialog.title }}

    component(v-bind:is="dialog.component")

    ul(slot="footer")
        li: button(@click="dialog.hub.$emit('error', 'this is a notification error')") Error
        li: button(@click="dialog.hub.$emit('close')") Cancel
</template>

<script>
    import DialogComponent from './dialog'
    import ExampleKonnector from '../components/konnectors/example'

const Connectors = {
    'dialog-1': {
        title: "dialog title",

        headerStyles: {
            'background-image': `url(header.png)`,
            'height': '100px'
        },

        component: ExampleKonnector
    }
}

    export default {
        data () {
            return {
                dialog: null
            }
        },

        components: {
            'cozy-dialog': DialogComponent
        },

        created () {
            this.updateDialogs(this.$router.currentRoute.params.connector)
        },

        watch: {
            '$route': 'updateDialogs'
        },

        methods: {
            updateDialogs(connector) {
                if (!connector || !Connectors[connector]) {
                    this.dialog = null
                } else {
                    this.dialog = Connectors[connector]
                }
            }
        }
    }
</script>