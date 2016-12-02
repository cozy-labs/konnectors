import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountsList from './AccountsList'

const CategoryList = ({ t, accounts, children }) => (
    <div class="content">
        <h1>{t('my_accounts category title')}</h1>
        <AccountsList accounts={filterUnconnected(accounts)} />
        {children}
    </div>
)

const filterUnconnected = (accounts) =>
  accounts.filter(a => a.accounts.length === 0)

export default translate()(CategoryList)
