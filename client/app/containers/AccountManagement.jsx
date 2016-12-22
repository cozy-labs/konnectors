/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import { connectToStore } from '../lib/accountStore'
import statefulComponent from '../lib/statefulComponent'
import AccountConfigForm from '../components/AccountConfigForm'

const AccountManagement = statefulComponent({
  selected: 0
}, (setState) => ({
  selectAccount: (idx) => {
    setState({ selected: idx })
  }
}))(
  ({ t, router, connector, folders, selected, selectAccount }) => (
    <div>
      <div class='account-management'>
        <div class='account-list'>
          <ul>
            {connector.accounts.map((account, key) => (
              <li>
                <a
                  class={selected === key ? 'selected' : ''}
                  onClick={() => selectAccount(key)}
                >
                  {account.hasOwnProperty('login')
                    ? account.login
                    : t('my_accounts account index', {index, key})}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <AccountConfigForm
          fields={connector.fields}
          folders={folders}
          values={connector.accounts[selected]}
          connectorName={connector.name}
          onSubmit={values => onConnectAccount(connector.id, values)}
        />
      </div>
      <div class='account-management-controls'>

      </div>
    </div>
  )
)

export default translate()(withRouter(
  connectToStore(
    state => ({
      folders: state.folders.map(f => f.path + '/' + f.name)
    }),
    (store, props) => {
      const {t, router} = props
      return {
        onConnectAccount: (connectorId, values) => {
          // return store.connectAccount(connectorId, values)
          //   .catch(error => { // eslint-disable-line
          //     Notifier.error(t('my_accounts account config error'))
          //     return Promise.reject(new Error(t('my_accounts account config error')))
          //   })
          //   .then(() => store.startConnectorPoll(connectorId))
          //   .then(() => {
          //     router.goBack()
          //     Notifier.info(t('my_accounts account config success'))
          //   })
        }
      }
    }
  )(AccountManagement)
))
