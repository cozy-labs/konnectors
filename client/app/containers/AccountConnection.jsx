/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import { connectToStore } from '../lib/accountStore'

import Notifier from '../components/Notifier'
import AccountConnectionForm from '../components/AccountConnectionForm'

const AccountConnection = ({ t, router, connector, onConnectAccount }) => (
  <div class='account-connection'>
    <div>
      <h3>Lorem ipsum</h3>
    </div>
    <div>
      <h3>{t('my_accounts account config title', {name: connector.name})}</h3>
      <AccountConnectionForm
        fields={connector.fields}
        connectorName={connector.name}
        onSubmit={values => onConnectAccount(connector.id, values)}
      />
    </div>
  </div>
)

export default translate()(withRouter(
  connectToStore(
    state => {
      return {

      }
    },
    (store, props) => {
      const {t, router} = props
      return {
        onConnectAccount: (connectorId, values) => {
          return store.connectAccount(connectorId, values)
            .catch(error => { // eslint-disable-line
              Notifier.error(t('my_accounts account config error'))
              return Promise.reject(new Error(t('my_accounts account config error')))
            })
            .then(() => store.startConnectorPoll(connectorId))
            .then(() => {
              router.goBack()
              Notifier.info(t('my_accounts account config success'))
            })
        }
      }
    }
  )(AccountConnection)
))
