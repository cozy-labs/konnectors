import Vue from 'vue'
import App from './app'


document.addEventListener('DOMContentLoaded', function initialize () {
    new Vue({
        el: '[role=application]',
        render: h => h(App),
        components: { App }
    })
})
