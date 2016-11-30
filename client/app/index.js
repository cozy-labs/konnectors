import './lib/polyfills'
import { h, render } from 'preact'

import App from './app'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
const konnectors = window.initKonnectors

render(
    <App context={context} lang={lang} konnectors={konnectors}/>, 
    document.querySelector('[role=application]')
);
