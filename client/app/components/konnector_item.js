import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'

const ENABLE_DEFAULT_ICON = false

const KonnectorItem = ({ t, onClick, title, subtitle, slug, iconName, backgroundCSS = 'white' }) => (
    <a class="item-wrapper" onClick={() => onClick(slug)}>
        <header style={{background: backgroundCSS}}>
            {iconName && <svg class="item-icon"><use xlinkHref={icon(iconName)}/></svg>}
        </header>
        <p class="item-title">{title}</p>
        {subtitle && <p class="item-subtitle">{subtitle}</p>}
    </a>
)

const icon = (iconName) => {
    let icon
    // fallback to use a default icon if icon not found
    // try {
    //     icon = require(`../assets/icons/${iconName}.svg`)
    // } catch (e) {
    //     if (ENABLE_DEFAULT_ICON) {
    //         icon = require('../assets/icons/default_myaccount.svg')
    //     } else {
    //         icon = ''
    //     }
    // }
    return icon
}

export default translate()(KonnectorItem)