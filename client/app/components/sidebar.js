import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'

const Sidebar = ({ t }) => (
    <aside>
        <h4>{t('my_accounts title')}</h4>
        <ul role="navigation">
            <li>
                <a href="/">
                    <svg><use xlinkHref={require('../assets/sprites/icon-discovery.svg')}/></svg>
                    {t('my_accounts discovery title')}
                </a>
            </li>
            <li>
                <a href="/category">
                    <svg><use xlinkHref={require('../assets/sprites/icon-category.svg')}/></svg>
                    {t('my_accounts category title')}
                </a>
            </li>
            <li>
                <a href="/connected">
                    <svg><use xlinkHref={require('../assets/sprites/icon-connected.svg')}/></svg>
                    {t('my_accounts connected title')}
                </a>
            </li>
        </ul>
    </aside>
)

export default translate()(Sidebar)