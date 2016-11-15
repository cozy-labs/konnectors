<template lang="pug">
    div(role="notification")
        div(role="contentinfo", :class="item.type")
          | {{ item.label }}
</template>

<script>
    export default {
        props: ['item']
    }
</script>

<style lang="stylus">
    [role='notification']
        position absolute
        z-index 1000

        left 0
        right 0

        display flex
        align-items center
        justify-content center

    [role="contentinfo"]
        flex-direction column
        flex 0 1 50rem

        &.error
            background red
            color white
</style>
