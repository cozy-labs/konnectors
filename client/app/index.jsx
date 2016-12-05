import './lib/polyfills'
/** @jsx h */
import { h, render } from 'preact'
import { Router, Route, Redirect, hashHistory } from 'react-router'

import App from './components/App'
import DiscoveryList from './components/DiscoveryList'
import CategoryList from './components/CategoryList'
import ConnectedList from './components/ConnectedList'
import AccountDialog from './components/AccountDialog'
import UseCaseDialog from './components/UseCaseDialog'
import UseCasesHelper from './lib/useCasesHelper'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'
// accounts
const accounts = window.initKonnectors
const connectedAccounts = accounts.filter(a => a.accounts.length !== 0)
const unconnectedAccounts = accounts.filter(a => a.accounts.length === 0)
// use cases
const useCasesHelper = new UseCasesHelper(context)
const useCases = useCasesHelper.getUseCases()

const categories = accounts.map(a => a.category).filter((cat, idx, all) => all.indexOf(cat) === idx)

const accountsByCategory = ({filter}) => {
  // unconnected accounts for category views
  return filter === 'all' ? unconnectedAccounts
    : unconnectedAccounts.filter(a => a.category === filter)
}

render((
  <Router history={hashHistory}>
    <Route
      component={(props) =>
        <App context={context} lang={lang} categories={categories}{...props}
        />}
    >
      <Redirect from='/' to='/discovery' />
      <Route
        path='/discovery'
        component={(props) => <DiscoveryList useCases={useCases} {...props} />}
      >
        <Route
          path=':useCase'
          component={(props) =>
            <UseCaseDialog
              item={useCases.find(u => u.slug === props.params.useCase)}
              {...props}
            />}
        />
      </Route>
      <Redirect from='/category' to='/category/all' />
      <Route
        path='/category/:filter'
        component={(props) =>
          <CategoryList
            accounts={accountsByCategory(props.params)} {...props}
          />}
      >
        <Route
          path=':account'
          component={(props) =>
            <AccountDialog
              item={accounts.find(a => a.slug === props.params.account)}
              {...props}
            />}
        />
      </Route>
      <Route
        path='/connected'
        component={(props) =>
          <ConnectedList accounts={connectedAccounts} {...props} />}
      >
        <Route
          path=':account'
          component={(props) =>
            <AccountDialog
              item={accounts.find(u => u.slug === props.params.account)}
              {...props}
            />}
        />
      </Route>
    </Route>
  </Router>
), document.querySelector('[role=application]'))
