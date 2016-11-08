<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

    block dialog
        div(aria-hidden='false', role='dialog')
            div(role='separator', v-on:click="closeWindow")
            .wrapper
                div(role='contentinfo')
                    a(v-on:click="closeWindow", title='close') Fermer
                    p hello
        </div>
</template>


<script>
    export default {
        methods: {
            closeWindow () {
                this.$router.push({ name: 'categoryList'})
            }
        }
    }
</script>
