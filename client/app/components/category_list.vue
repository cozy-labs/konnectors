<template lang="pug">
    extends ../templates/layout.pug

    block content
        h1 {{ 'my_accounts category title' | t }}
        article {{ 'my_accounts coming_soon' | t }}

        ul
            li
                button(v-on:click="openDialog") open dialog
</template>

<script>
    export default {
      methods: {
          openDialog () {
              this.$emit('open-dialog', 'dialog-1')
          }
      }
    }
</script>
