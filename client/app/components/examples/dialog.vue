<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

    block dialog
        div(aria-hidden='false', role='dialog')
            div(role='separator', v-on:click="closeWindow")
            .wrapper
                div(role='contentinfo')
                    header
                        a(v-on:click="closeWindow", title='close')
                            | Close

                    p hello

                    footer
                        button(v-on:click="submit", title='submit')
                            | Next

        </div>
</template>


<script>
    export default {
        methods: {
            closeWindow () {
                this.$router.push({ name: 'categoryList'})
            },
            submit () {
                const url = ''
                const data = {}

                // Error
                //this.next(true)

                // Success
                this.next(null, true)
            },
            next (err, result) {
                if (err) this.$router.push({ name: 'dialogError'})
                else this.$router.push({ name: 'dialogSuccess'})
            }
        }
    }
</script>
