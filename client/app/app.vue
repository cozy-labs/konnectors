<template lang="pug">
    div(role="application")
        nav(role="navigation")
            h4 {{ 'my_accounts title' | t }}
            ul
                li
                    router-link(to="/discovery")
                        svg: use(:xlink:href="require('./assets/sprites/icon-discovery.svg')")
                        | {{ 'my_accounts discovery title' | t }}

                li
                    router-link(to="/category")
                        svg: use(:xlink:href="require('./assets/sprites/icon-category.svg')")
                        | {{ 'my_accounts category title' | t }}

                li
                    router-link(to="/connected")
                        svg: use(:xlink:href="require('./assets/sprites/icon-connected.svg')")
                        | {{ 'my_accounts connected title' | t }}

        router-view
</template>


<style lang="stylus">
@import "../node_modules/normalize.css/normalize.css";
@import "styles/app.styl"
</style>
