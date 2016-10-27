<template lang="pug">
    div(role="application")
        h1 {{ 'my_accounts title' | t }}

        nav(role="navigation")
            ul
                li
                    router-link(to="/discovery")
                        | {{ 'my_accounts discovery title' | t }}

                li
                    router-link(to="/category")
                        | {{ 'my_accounts category title' | t }}

                li
                    router-link(to="/connected")
                        | {{ 'my_accounts connected title' | t }}

        router-view
</template>


<style lang="stylus">
@import "../node_modules/normalize.css/normalize.css";
</style>
