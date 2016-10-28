<template lang="pug">
    div(role="application")
        ul
            li: router-link(to="/foo") foo
            li: router-link(to="/bar") bar

        router-view
</template>


<style lang="stylus">
@import "../node_modules/normalize.css/normalize.css";
</style>
