<template lang="pug">
    extends ../templates/layout.pug

    block content
        include ../templates/category_list.pug

        ul
            li
                router-link(to="/category/sample") dialog test
</template>
