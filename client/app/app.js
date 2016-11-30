import { h, Component } from 'preact'

import { I18n } from './plugins/preact-polyglot'

import Sidebar from './components/sidebar'

const App = ({ context, lang, children }) => (
    <I18n context={context} lang={lang}>
        <div role="application">
            <Sidebar/>
            <main>
                <div role="contentinfo">
                    {children}
                </div>
            </main>
        </div>
    </I18n>
)

export default App