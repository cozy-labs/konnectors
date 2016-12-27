/** @jsx h */
import { h, Component } from 'preact'

import ConnectorDialog from '../components/ConnectorDialog'
import AccountConnection from '../components/AccountConnection'
import AccountManagement from '../components/AccountManagement'
import Notifier from '../components/Notifier'

const prepareConnectURL = (connector) => {
  let connectUrl = connector.connectUrl
  if (!connectUrl)
    return

  // Based on the current code borrowed from legacy konnectors, we check
  // if the url contains a redirect_uri or redirect_url string, we assume that
  // this string is positionned at the end of the connrectURL. In the future
  // we should quickly use an additionnal parameter indicating if the url needs
  // a redirect or not.
  const hasRedirect = !!(['redirect_uri=', 'redirect_url='].find((redirect) => {
    return connectUrl.indexOf(redirect) !== -1
  }))

  if (hasRedirect) {
    // Use Router instead of document ? or injected location ? How ?
    const l = document.location
    // Use function parameter in the future
    const accountIndex = 0

    const redirectUrl = `${l.origin}${l.pathname}/konnectors/`
      + `${connector.id}/${accountIndex}/redirect`
    connectUrl += encodeURIComponent(redirectUrl)
  }

  return connectUrl
}

export default class ConnectorManagement extends Component {
  constructor (props, context) {
    super(props, context)
    this.store = this.context.store
    const connector = this.store.find(c => c.slug === props.params.account)
    this.store.subscribeTo(
      connector.id,
      refreshedConnector => this.setState({ connector: refreshedConnector })
    )
    const { name, fields } = connector
    this.state = {
      connector,
      isConnected: connector.accounts.length !== 0,
      selectedAccount: 0,
      fields: this.configureFields(fields, context.t, name),
      submitting: false,
      deleting: false,
      error: null
    }
  }

  render () {
    const { slug, color, name, customView, accounts, lastImport } = this.state.connector
    const { isConnected, selectedAccount } = this.state
    return (
      <ConnectorDialog slug={slug} color={color.css} enableDefaultIcon>
        {isConnected
          ? <AccountManagement
              name={name}
              customView={customView}
              connectUrl={prepareConnectURL(this.state.connector)}
              lastImport={lastImport}
              accounts={accounts}
              values={accounts[selectedAccount]}
              synchronize={() => this.synchronize()}
              deleteAccount={idx => this.deleteAccount(idx)}
              onSubmit={values => this.connectAccount(values)}
              {...this.state}
              {...this.context} />
          : <AccountConnection
              name={name}
              customView={customView}
              connectUrl={prepareConnectURL(this.state.connector)}
              onSubmit={values => this.connectAccount(values)}
              {...this.state}
              {...this.context} />
        }
      </ConnectorDialog>
    )
  }

  gotoParent () {
    const router = this.context.router
    let url = router.location.pathname
    router.push(url.substring(0, url.lastIndexOf('/')))
  }

  connectAccount (values) {
    const id = this.state.connector.id
    const { t } = this.context
    this.setState({ submitting: true })
    this.store.connectAccount(id, values)
      .then(fetchedConnector => {
        this.setState({ submitting: false })
        if (fetchedConnector.importErrorMessage) {
          this.setState({ error: fetchedConnector.importErrorMessage })
        } else {
          this.gotoParent()
          Notifier.info(t('my_accounts account config success'))
        }
      })
      .catch(error => { // eslint-disable-line
        this.setState({ submitting: false })
        Notifier.error(t('my_accounts account config error'))
      })
  }

  synchronize () {
    const id = this.state.connector.id
    const { t } = this.context
    this.setState({ synching: true })
    this.store.synchronize(id)
      .then(fetchedConnector => {
        this.setState({ synching: false })
        if (fetchedConnector.importErrorMessage) {
          this.setState({ error: fetchedConnector.importErrorMessage })
        }
      })
      .catch(error => { // eslint-disable-line
        this.setState({ synching: false })
        Notifier.error(t('my_accounts account config error'))
      })
  }

  deleteAccount (idx) {
    const id = this.state.connector.id
    const { t } = this.context
    this.setState({ deleting: true })
    this.store.deleteAccount(id, idx)
      .then(() => {
        this.setState({ deleting: false })
        if (this.state.connector.accounts.length === 0) {
          this.gotoParent()
        }
        Notifier.info(t('my_accounts account delete success'))
      })
      .catch(error => { // eslint-disable-line
        this.setState({ deleting: false })
        Notifier.error(t('my_accounts account delete error'))
      })
  }

  // Set default values for advanced fields that will not be shown
  // on the initial connection form
  configureFields (fields, t, connectorName) {
    if (fields.calendar && !fields.calendar.default) {
      fields.calendar.default = connectorName
    }
    if (fields.folderPath && !fields.folderPath.default) {
      fields.folderPath.default = t('my_accounts title') + '/' + connectorName
    }
    if (fields.folderPath && !fields.folderPath.options) {
      fields.folderPath.options = this.store.folders.map(f => f.path + '/' + f.name)
      fields.folderPath.folders = this.store.folders
    }
    if (!fields.frequency) {
      fields.frequency = {
        type: 'text',
        advanced: true
      }
    }
    if (fields.frequency && !fields.frequency.default) {
      fields.frequency.default = 'weekly'
    }
    if (fields.frequency &&
      (!fields.frequency.options || !fields.frequency.options.length)) {
      fields.frequency.options = ['hourly', 'daily', 'weekly', 'monthly']
    }
    return fields
  }
}
