import './lib/polyfills'
import { h, render } from 'preact'
import { Router, Route, Redirect, hashHistory } from 'react-router'

import App from './components/app'
import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'
import AccountDialog from './components/account_dialog'
import UseCaseDialog from './components/account_dialog'
import UseCaseHelper from './lib/useCasesHelper'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
const accounts = window.initKonnectors
const useCasesHelper = new UseCaseHelper(context)
const useCases = useCasesHelper.getUseCases()


const categories = accounts.map(a => a.category).filter((cat, idx, all) => all.indexOf(cat) === idx)

const accountsByCategory = ({filter}) => {
    return filter === 'all' ? accounts : accounts.filter(a => a.category === filter)
}

render((
    <Router history={hashHistory}>
        <Route component={(props) => <App context={context} lang={lang} categories={categories} {...props}/>}>
            <Redirect from="/" to="/discovery"/>
            <Route path="/discovery" component={(props) => <DiscoveryList useCases={useCases} {...props} />}>
              <Route path=":useCase" component={(props) => <UseCaseDialog item={useCases.find(u => u.slug === props.params.useCase)} {...props}/>}/>
            </Route>
            <Redirect from="/category" to="/category/all"/>
            <Route path="/category/:filter" component={(props) => <CategoryList accounts={accountsByCategory(props.params)} {...props}/>}>
                <Route path=":account" component={(props) => <AccountDialog item={accounts.find(a => a.slug === props.params.account)} {...props}/>}/>
            </Route>
            <Route path="/connected" component={(props) => <ConnectedList accounts={accounts} {...props} />}>
              <Route path=":account" component={(props) => <AccountDialog item={accounts.find(u => u.slug === props.params.account)} {...props}/>}/>
            </Route>
        </Route>
    </Router>
), document.querySelector('[role=application]'))
