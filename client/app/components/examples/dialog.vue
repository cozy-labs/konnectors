<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

    block dialog
        .dialogs(aria-hidden='false')
            div(role='separator', v-on:click="closeWindow")
            .wrapper
                div(role='contentinfo')
                    button(v-on:click="closeWindow") close
                    p hello
        </div>
</template>
