import './lib/polyfills'
import { h, render } from 'preact'
import { Router, Route, Redirect, hashHistory } from 'react-router'

import App from './app'
import Discovery from './components/discovery'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'
import ItemDialog from './components/item_dialog'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
const konnectors = window.initKonnectors

render((
    <Router history={hashHistory}>
        <Route component={(props) => <App context={context} lang={lang} {...props}/>}>
            <Route path="/" component={Discovery}/>
            <Redirect from="/category" to="/category/all"/>
            <Route path="/category/:filter" component={(props) => <CategoryList konnectors={konnectors} {...props}/>}>
                <Route path=":account" component={(props) => <ItemDialog item={konnectors.find(k => k.slug === props.params.account)} {...props}/>}/>
            </Route>
            <Route path="/connected" component={ConnectedList}/>
        </Route>
    </Router>
), document.querySelector('[role=application]'))
