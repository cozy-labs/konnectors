import { h, render } from 'preact'
import { Router } from 'preact-router'
import { translate } from './plugins/preact-polyglot'

import Navigation from './components/navigation'
import Discovery from './components/discovery'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

const App = ({ t }) => (
    <div role="application">
        <aside>
            <h4>{t('my_accounts title')}</h4>
            <Navigation/>
        </aside>
        <main>
            <div role="contentinfo">
                <Router>
                    <Discovery path="/"/>
                    <CategoryList path="/category"/>
                    <ConnectedList path="/connected"/>
                </Router>
            </div>
        </main>
    </div>
)

export default translate()(App)
