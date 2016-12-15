import './lib/polyfills'
/** @jsx h */
import { h, render } from 'preact'
import { Router, Route, Redirect, hashHistory } from 'react-router'

import { I18n } from './plugins/preact-polyglot'
import { AccountStore, Provider } from './lib/accountStore'

import App from './components/App'
import DiscoveryList from './components/DiscoveryList'
import CategoryList from './components/CategoryList'
import ConnectedList from './components/ConnectedList'
import ConnectorDialog from './components/ConnectorDialog'
import UseCaseDialog from './components/UseCaseDialog'
import UseCasesHelper from './lib/useCasesHelper'
import AccountsHelper from './lib/accountsHelper'

import './styles/index.styl'

const lang = document.documentElement.getAttribute('lang') || 'en'
const context = window.context || 'cozy'

// accounts
const accounts = AccountsHelper.checkProperties(window.initKonnectors)
const store = new AccountStore(accounts)

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

// To complete a given use case with all related accounts object
const completeUseCase = (usecase) => {
  if (!usecase) return null
  if (usecase.accounts) {
    const completed = Object.assign({}, usecase)
    completed.accounts = []
    let account
    usecase.accounts.map(a => {
      account = accounts.find(u => u.slug === a.slug)
      if (account) completed.accounts.push(account)
    })
    return completed
  }
}

render((
  <Provider store={store}>
    <I18n context={context} lang={lang}>
      <Router history={hashHistory}>
        <Route
          component={(props) =>
            <App categories={categories} {...props}
            />}
        >
          <Redirect from='/' to='/discovery' />
          <Route
            path='/discovery'
            component={(props) =>
              <DiscoveryList
                useCases={useCases} context={context} {...props}
              />}
          >
            <Route
              path=':useCase'
              component={(props) =>
                <UseCaseDialog
                  item={completeUseCase(
                      useCases.find(u => u.slug === props.params.useCase)
                  )}
                  context={context}
                  {...props}
                />}
            />
            <Route
              path=':useCase/:account'
              component={(props) =>
                <div class='multi-dialogs-wrapper'>
                  <UseCaseDialog
                    item={completeUseCase(
                        useCases.find(u => u.slug === props.params.useCase)
                    )}
                    context={context}
                    {...props}
                  />
                  <ConnectorDialog
                    item={accounts.find(a => a.slug === props.params.account)}
                    enableDefaultIcon
                    {...props}
                  />
                </div>}
            />
          </Route>
          <Redirect from='/category' to='/category/all' />
          <Route
            path='/category/:filter'
            component={(props) =>
              <CategoryList
                category={props.params.filter}
                accounts={accountsByCategory(props.params)} {...props}
              />}
          >
            <Route
              path=':account'
              component={(props) =>
                <ConnectorDialog
                  item={accounts.find(a => a.slug === props.params.account)}
                  enableDefaultIcon
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
                <ConnectorDialog
                  item={accounts.find(u => u.slug === props.params.account)}
                  enableDefaultIcon
                  {...props}
                />}
            />
          </Route>
        </Route>
      </Router>
    </I18n>
  </Provider>
), document.querySelector('[role=application]'))
