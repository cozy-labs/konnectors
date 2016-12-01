import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountItem from './account_item'

const AccountList = ({ t, accounts }) => (
    <div class="accounts-list">
        {accounts.map(a => {
            if (!a.accounts.length) {
                return <AccountItem
                    title={a.name}
                    subtitle={t(a.category + ' category')}
                    iconName={a.slug}
                    slug={a.slug}
                    enableDefaultIcon
                    backgroundCSS={a.color.css}
                />
            }
        })}
    </div>
)

export default translate()(AccountList)
