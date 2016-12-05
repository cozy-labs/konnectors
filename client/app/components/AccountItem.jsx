/** @jsx h */
import { h } from 'preact'
import { Link, withRouter } from 'react-router'
import { translate } from '../plugins/preact-polyglot'

const AccountItem = ({ title, subtitle, slug, iconName, backgroundCSS = 'white', enableDefaultIcon = false, router }) => (
  <Link class='item-wrapper' to={`${router.location.pathname}/${slug}`}>
    <header style={{background: backgroundCSS}}>
      {iconName &&
        <svg class='item-icon'>
          <use xlinkHref={icon(iconName, enableDefaultIcon)} />
        </svg>
      }
    </header>
    <p class='item-title'>{title}</p>
    {subtitle && <p class='item-subtitle'>{subtitle}</p>}
  </Link>
)

const icon = (iconName, enableDefaultIcon) => {
  let icon
    // fallback to use a default icon if icon not found
  try {
    icon = require(`../assets/icons/${iconName}.svg`)
  } catch (e) {
    if (enableDefaultIcon) {
      icon = require('../assets/icons/default_myaccount.svg')
    } else {
      icon = ''
    }
  }
  return icon
}

export default translate()(withRouter(AccountItem))
