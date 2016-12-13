/** @jsx h */
import { h } from 'preact'
import { withRouter } from 'react-router'

import AccountConnection from '../containers/AccountConnection'
import AccountsManagement from '../containers/AccountsManagement'

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

const AccountDialogContent = (props) => {
  const isConnected = props.connector.accounts.length !== 0
  if (isConnected) {
    return <AccountsManagement {...props} />
  }
  return <AccountConnection {...props} />
}

const AccountDialog = ({ router, item, iconName, enableDefaultIcon }) => (
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
          <AccountDialogContent connector={item} />
        </div>
      </div>
    </div>
  </div>
)

export default withRouter(AccountDialog)
