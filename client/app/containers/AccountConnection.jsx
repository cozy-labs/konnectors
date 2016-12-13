/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import { connectToStore } from '../lib/accountStore'

import Notifier from '../components/Notifier'
import AccountConnectionForm from '../components/AccountConnectionForm'

const AccountConnection = ({ t, router, connector, submitting, onConnectAccount }) => (
  <div class="account-connection">
    <div>
      <h3>Lorem ipsum</h3>
    </div>
    <div>
      <h3>{t('my_accounts account config title', {name: connector.name})}</h3>
      <AccountConnectionForm
        fields={connector.fields}
        onSubmit={values => onConnectAccount(connector.id, values)}
        submitting={submitting}
      />
    </div>
  </div>
)

export default translate()(
  connectToStore(
    state => {
      return {
        submitting: state.working
      }
    },
    (store, props) => {
      const {t, router} = props
      return {
        onConnectAccount: (accountId, values) => {
          store.connectAccount(accountId, values)
            .then(() => {
              router.goBack()
              Notifier.info(t('my_accounts account config success'))
            })
            .catch(error => {
              if (error.message === 'bad credentials') {
                Notifier.error(t('my_accounts account config bad credentials'))
              } else {
                Notifier.error(t('my_accounts account config error'))
              }
            })
        }
      }
    }
)(withRouter(AccountConnection)))
