import Vue from 'vue'
import VueRouter from 'vue-router'

(() => {
    "use strict";

    Vue.use(VueRouter);

    const Data = [
      {
        title: 'Découverte',
        slug: 'discovery',
        id: 'discovery-item',
        description: 'Bientôt disponible !'
      },
    	{
        title: 'Catégories',
        slug: 'category',
        id: 'category-item',
        description: 'Bientôt disponible !'
      },
      {
        title: 'Connecté',
        slug: 'connected',
        id: 'connected-item',
        description: 'Bientôt disponible !'
      }
    ];

    const templateContent = '<main role="main" v-bind:id="content.id"><h2>{{ content.title }}</h2><article></article>{{ content.description }}</main>';

    const getComponent = (slug) => {
    	return {
        template: templateContent,
        data () {
        	return {
          	content: null
          }
        },
        created () {
          this.fetchData()
        },
        watch: {
          '$route': 'fetchData'
        },
        methods: {
        	fetchData () {
            this.content = Data.find((data) => {
              return data.slug === this.$route.name
            });
          }
        }
      }
    }

    const routes = [
      { name: 'default', path: '/', redirect: '/category' },
      { name: 'category', path: '/category', component: getComponent('category') },
      { name: 'discovery', path: '/discovery', component: getComponent('discovery') },
      { name: 'connected', path: '/connected', component: getComponent('connected') }
    ];

    const router = new VueRouter({
      routes
    })

    const app = new Vue({
      router
    }).$mount('#app')

})();
