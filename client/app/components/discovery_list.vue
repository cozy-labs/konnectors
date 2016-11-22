<template lang="pug">
    extends ../templates/layout.pug

    block content
        h1 {{ 'my_accounts discovery title' | t }}
        article {{ 'my_accounts coming_soon' | t }}
</template>

<script>
    // TODO: ajouter un composant Item
    // si sera affiché pour chaque Item
    const DiscoveryItems = [{
        id: '',
        title: '',
        color: '',
        logo: ''
    }]

    // TODO: how to "fetch" data?
    // get all connected items
    export default {
      data () {
        return {
            items: DiscoveryItems
        }
      },
      computed: {

      },
      methods: {
          openDialog () {
              this.$emit('open-dialog', 'dialog-1')
          }
      }
    }
</script>
