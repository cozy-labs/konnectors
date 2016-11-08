<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

    block notification
        block notification
            div(aria-hidden='false', role='alert')
                .wrapper
                    div(role='contentinfo', class='alert-error')
                        p error

</template>
