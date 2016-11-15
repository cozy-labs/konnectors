<template lang="pug">
    extends ../../templates/dialog.pug

    block dialog_header
        p header sample

    block dialog_content
        p dialog free content

    block dialog_footer
        button(v-on:click="addError", title='display error')
            | display error
        button(v-on:click="onClose", title='cancel')
            | cancel
        button(v-on:click="onSuccess", title='OK')
            | next
</template>


<script>
    export default {
        props: [
          'onClose',
          'onSuccess',
          'onError',
          'headerStyles'],

        methods: {
            addError () {
                this.onError('this is a notification error')
            }
        }
    }
</script>
