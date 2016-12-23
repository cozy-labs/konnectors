/** @jsx h */
import { h, Component } from 'preact'

import ConnectorDialog from '../components/ConnectorDialog'
import AccountConnection from '../components/AccountConnection'
import AccountManagement from '../components/AccountManagement'
import Notifier from '../components/Notifier'

export default class ConnectorManagement extends Component {
  constructor (props, context) {
    super(props, context)
    const { name, fields } = props.connector
    this.store = this.context.store
    this.state = {
      selectedAccount: 0,
      fields: this.configureFields(fields, context.t, name),
      submitting: false,
      error: null
    }
  }

  render () {
    const { slug, color, name, customView, accounts } = this.props.connector
    const { t } = this.context
    const isConnected = accounts.length !== 0
    const selectedAccount = accounts[this.state.selectedAccount]
    return (
      <ConnectorDialog slug={slug} color={color.css} enableDefaultIcon>
        {isConnected
          ? <AccountManagement
              t={t}
              name={name}
              customView={customView}
              accounts={accounts}
              values={selectedAccount}
              onSubmit={values => this.onConnectAccount(values)}
              {...this.state} />
          : <AccountConnection
              t={t}
              name={name}
              customView={customView}
              onSubmit={values => this.onConnectAccount(values)}
              {...this.state} />
        }
      </ConnectorDialog>
    )
  }

  onConnectAccount (values) {
    const id = this.props.connector.id
    const { t, router } = this.context
    this.setState({ submitting: true })
    this.store.connectAccount(id, values)
      .then(fetchedConnector => {
        this.setState({ submitting: false })
        // this.store.updateConnector(fetchedConnector) ???
        if (fetchedConnector.importErrorMessage) {
          this.setState({ error: fetchedConnector.importErrorMessage })
        } else {
          router.goBack()
          Notifier.info(t('my_accounts account config success'))
        }
      })
      .catch(error => { // eslint-disable-line
        this.setState({ submitting: false })
        Notifier.error(t('my_accounts account config error'))
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
