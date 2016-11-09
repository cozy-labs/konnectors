<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

    block dialog
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
                            button(v-on:click="next", title='submit')
                                | next

</template>

<script>
    export default {
        data () {
            return {
                hidden: false,
                header: {
                    'background-image': 'url(test0.png)'
                },
                routes: {
                    success: { name: 'dialogSuccess' },
                    error: { name: 'dialogError' },
                    close: { name: 'categoryList' }
                }
            }
        },
        computed: {
            headerStyles: {
                get () {
                    let styles
                    for (let prop in this.header) {
                        const value = `${prop}: ${this.header[prop]}`
                        if (styles === undefined) styles = value
                        else styles += `; ${value}`
                    }
                    return styles
                }
            }
        },
        methods: {
            validate () {
                // Add specific validation here
                // return error if exists
                // otherwise return nothing
            },

            submit (complete) {
                // Add submit behavior here
                if (complete !== undefined) complete(this.data)
                else complete('Missing `onSuccess` callback')
            },

            onClose () {
                this.$router.push(this.routes.close)
            },

            onError (err) {
                const route = Object.assign(this.routes.error, {
                    params: err
                })
                this.$router.push(route)
                return false
            },

            onSuccess (result) {
                const route = Object.assign(this.routes.success, {
                    params: result
                })
                this.$router.push(route)
                return true
            },

            next () {
                // Validation client-side
                const err = this.validate()
                if (err) return this.onError(err)

                // Validation server-side
                this.submit((err, result) => {
                    if (err) return this.onError(err)
                    else return this.onSuccess(result)
                })
            }
        }
    }
</script>
