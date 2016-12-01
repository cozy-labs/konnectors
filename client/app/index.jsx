import './lib/polyfills'
import { h, render } from 'preact'
import { Router, Route, Redirect, hashHistory } from 'react-router'

import App from './components/app'
import Discovery from './components/discovery'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'
import AccountDialog from './components/account_dialog'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
const accounts = window.initKonnectors

const categories = accounts.map(a => a.category).filter((cat, idx, all) => all.indexOf(cat) === idx)

const accountsByCategory = ({filter}) => {
    return filter === 'all' ? accounts : accounts.filter(a => a.category === filter)
}

render((
    <Router history={hashHistory}>
        <Route component={(props) => <App context={context} lang={lang} categories={categories} {...props}/>}>
            <Route path="/" component={Discovery}/>
            <Redirect from="/category" to="/category/all"/>
            <Route path="/category/:filter" component={(props) => <CategoryList accounts={accountsByCategory(props.params)} {...props}/>}>
                <Route path=":account" component={(props) => <AccountDialog item={accounts.find(a => a.slug === props.params.account)} {...props}/>}/>
            </Route>
            <Route path="/connected" component={(props) => <ConnectedList accounts={accounts} {...props} />} />
        </Route>
    </Router>
), document.querySelector('[role=application]'))
