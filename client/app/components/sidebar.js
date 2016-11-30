import { h, render } from 'preact'
import { Link } from 'preact-router'
import { translate } from '../plugins/preact-polyglot'

const Sidebar = ({ t }) => (
    <aside>
        <h4>{t('my_accounts title')}</h4>
        <ul role="navigation">
            <li>
                <Link href="/">
                    <svg><use xlinkHref={require('../assets/sprites/icon-discovery.svg')}/></svg>
                    {t('my_accounts discovery title')}
                </Link>
            </li>
            <li>
                <Link href="/category">
                    <svg><use xlinkHref={require('../assets/sprites/icon-category.svg')}/></svg>
                    {t('my_accounts category title')}
                </Link>
            </li>
            <li>
                <Link href="/connected">
                    <svg><use xlinkHref={require('../assets/sprites/icon-connected.svg')}/></svg>
                    {t('my_accounts connected title')}
                </Link>
            </li>
        </ul>
    </aside>
)

export default translate()(Sidebar)