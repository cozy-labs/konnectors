<template lang="pug">
    a.item-wrapper(:href="link")
        header(:style="headerBackground")
            svg.item-icon(v-if="icon")
                use(:xlink:href="icon")
        p.item-title {{ title }}
        p.item-subtitle(v-if="subtitle") {{ subtitle }}
</template>

<script>
    export default {
        props: {
            title: {
                type: String,
                required: true
            },
            link: {
                type: String,
                required: true
            },
            iconName: {
                type: String
            },
            subtitle: {
                type: String,
            },
            backgroundCSS: {
                type: String,
                default: 'white'
            },
            enableDefaultIcon: {
                type: Boolean,
                default: false
            }
        },

        data () {
            return {
                headerBackground: {
                    background: this.backgroundCSS
                }
            }
        },

        computed: {
            icon () {
                let icon
                // fallback to use a default icon if icon not found
                try {
                    icon = require(`../assets/icons/${this.iconName}.svg`)
                } catch (e) {
                    if (this.enableDefaultIcon) {
                        icon = require('../assets/icons/default_myaccount.svg')
                    } else {
                        icon = ''
                    }
                }
                return icon
            }
        }
    }
</script>

<style lang="stylus">
    @import '../styles/base/_colors'

    .item-wrapper
        width               19em
        border-radius       4px
        background-color    white
        box-shadow          0 2px 6px 0 rgba(0, 0, 0, 0.15)
        padding-bottom      1em
        margin              .7em
        cursor              pointer
        text-decoration     none
        transition          .2s ease all

        &:hover
            box-shadow          0 4px 12px 0 rgba(0, 0, 0, 0.25)
            transform           scale(1.05)
            transition          .2s ease all

        header
            border-radius       4px 4px 0px 0px
            height              9em
            position            relative

            .item-icon
                border-radius   4px 4px 0px 0px
                width           14em
                height          4em
                margin          2.5em

        .item-title
            padding             0em .5em
            font-size           20px
            margin              .5em
            color               black


        .item-subtitle
            font-size           14px
            padding             0em 1em
            margin              0em .5em
            color               $grey-06
</style>
