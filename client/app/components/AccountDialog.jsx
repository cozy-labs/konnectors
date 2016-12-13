/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import { connectToStore } from '../lib/accountStore'

import Notifier from './Notifier'
import AccountConfigForm from './AccountConfigForm'

const CloseButton = withRouter(({ router }) => (
  <div class='close-button' role='close' onClick={router.goBack} />
))

// Fallback to get the item icon and avoid error if not found
// with a possible default icon
const getIcon = (iconName, enableDefaultIcon) => {
  let icon = ''
  try {
    icon = require(`../assets/icons/${iconName}.svg`)
  } catch (e) {
    if (enableDefaultIcon) {
      icon = require('../assets/icons/default_myaccount.svg')
    }
  }
  return icon
}

const AccountDialog = ({ t, router, item, submitting, onConnectAccount, iconName, enableDefaultIcon }) => (
  <div role='dialog' class='account-dialog'>
    <div role='separator' onClick={router.goBack} />
    <div class='wrapper'>
      <div role='contentinfo'>
        <div
          class='dialog-header'
          style={{background: item.color.css || 'white'}}
        >
          <svg class='item-icon'>
            <use
              xlinkHref={getIcon(iconName || item.slug, enableDefaultIcon)}
            />
          </svg>
          <CloseButton />
        </div>
        <div class='dialog-content'>
          <div>
            <h3>Lorem ipsum</h3>
          </div>
          <div>
            <h3>{t('my_accounts account config title', {name: item.name})}</h3>
            <AccountConfigForm
              fields={item.fields}
              accountName={item.name}
              onSubmit={values => onConnectAccount(item.id, values)}
              submitting={submitting}
            />
          </div>
        </div>
      </div>
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
)(withRouter(AccountDialog)))
