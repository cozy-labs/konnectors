/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import { connectToStore } from '../lib/accountStore'

import Notifier from '../components/Notifier'
import AccountConnectionForm from '../components/AccountConnectionForm'


const prepareConnectURL = (connector) => {
  let connectUrl = connector.connectUrl
  if(!connectUrl)
    return

  // Based on the current code borrowed from legacy konnectors, we check
  // if the url contains a redirect_uri or redirect_url string, we assume that
  // this string is positionned at the end of the connrectURL. In the future
  // we should quickly use an additionnal parameter indicating if the url needs
  // a redirect or not.
  const hasRedirect = !!(['redirect_uri=', 'redirect_url='].find((redirect) => {
    return connectUrl.indexOf(redirect) !== -1
  }))


  if(hasRedirect){
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


const AccountConnection = ({ t, router, connector, onConnectAccount }) => (
  <div class='account-connection'>
    <div>
      <h3>Lorem ipsum</h3>
    </div>
    <div>
      <h3>{t('my_accounts account config title', {name: connector.name})}</h3>
      <AccountConnectionForm
        customView={connector.customView}
        connectUrl={prepareConnectURL(connector)}
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
