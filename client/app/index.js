import './lib/polyfills'
import { h, render } from 'preact'
import { I18n } from './plugins/preact-polyglot'
import App from './app'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
const konnectors = window.initKonnectors

render((
    <I18n context={context} lang={lang}>
        <App konnectors={konnectors}/>
    </I18n>
), document.querySelector('[role=application]'));
