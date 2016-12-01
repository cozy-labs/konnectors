import { h, render } from 'preact'
import { Link, withRouter } from 'react-router'
import { translate } from '../plugins/preact-polyglot'

const ENABLE_DEFAULT_ICON = false

const AccountItem = ({ t, title, subtitle, slug, iconName, backgroundCSS = 'white', router }) => (
    <Link class="item-wrapper" to={`${router.location.pathname}/${slug}`}>
        <header style={{background: backgroundCSS}}>
            {iconName && <svg class="item-icon"><use xlinkHref={icon(iconName)}/></svg>}
        </header>
        <p class="item-title">{title}</p>
        {subtitle && <p class="item-subtitle">{subtitle}</p>}
    </Link>
)

const icon = (iconName) => {
    let icon
    // fallback to use a default icon if icon not found
    try {
        icon = require(`../assets/icons/${iconName}.svg`)
    } catch (e) {
        if (ENABLE_DEFAULT_ICON) {
            icon = require('../assets/icons/default_myaccount.svg')
        } else {
            icon = ''
        }
    }
    return icon
}

export default translate()(withRouter(AccountItem))
