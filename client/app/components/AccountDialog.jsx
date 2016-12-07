/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'

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

const AccountDialog = ({ t, router, item, iconName, enableDefaultIcon }) => (
  <div role='dialog' class='account-dialog'>
    <div role='separator' onClick={router.goBack} />
    <div class='wrapper'>
      <div role='contentinfo'>
        <header
          class='dialog-header'
          style={{background: item.color.css || 'white'}}
        >
          <svg class='item-icon'>
            <use
              xlinkHref={getIcon(iconName || item.slug, enableDefaultIcon)}
            />
          </svg>
          <CloseButton />
        </header>
        <main>
          <h3>{item.name}</h3>
          <div class=''>
            <AccountConfigForm fields={item.fields} slug={item.slug} />
          </div>
        </main>
      </div>
    </div>
  </div>
)

export default translate()(AccountDialog)
