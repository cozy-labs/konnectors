import { h, render } from 'preact'
import { Link, withRouter } from 'react-router'
import { translate } from '../plugins/preact-polyglot'

const Sidebar = ({ t, categories, router }) => (
    <aside>
        <h4>{t('my_accounts title')}</h4>
        <ul role="navigation">
            <li>
                <Link to="/discovery" activeClassName="router-link-active">
                    <svg><use xlinkHref={require('../assets/sprites/icon-discovery.svg')}/></svg>
                    {t('my_accounts discovery title')}
                </Link>
            </li>
            <li>
                <Link to="/category/all" activeClassName="router-link-active">
                    <svg><use xlinkHref={require('../assets/sprites/icon-category.svg')}/></svg>
                    {t('my_accounts category title')}
                </Link>
            </li>
            <ul>
                {categories.map(category => (
                    <li>
                        <Link to={`/category/${category}`} activeClassName="router-link-active">
                            {t(`${category} category`)}
                        </Link>
                    </li>
                ))}
            </ul>
            <li>
                <Link to="/connected" activeClassName="router-link-active">
                    <svg><use xlinkHref={require('../assets/sprites/icon-connected.svg')}/></svg>
                    {t('my_accounts connected title')}
                </Link>
            </li>
        </ul>
    </aside>
)

export default translate()(withRouter(Sidebar))
