/** @jsx h */
import { h } from 'preact'

import Dialog from './Dialog'
import AccountConnection from '../containers/AccountConnection'
import AccountManagement from '../containers/AccountManagement'

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

const ConnectorDialogContent = (props) => {
  const isConnected = props.connector.accounts.length !== 0
  if (isConnected) {
    return <AccountManagement {...props} />
  }
  return <AccountConnection {...props} />
}

const ConnectorDialog = ({ item, iconName, enableDefaultIcon }) => (
  <Dialog
    className='connector-dialog'
    headerStyle={{background: item.color.css || 'white'}}
    headerIcon={getIcon(iconName || item.slug, enableDefaultIcon)}
  >
    <ConnectorDialogContent connector={item} />
  </Dialog>
)

export default ConnectorDialog
