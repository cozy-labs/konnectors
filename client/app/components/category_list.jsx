import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountList from './account_list'

const CategoryList = ({ t, accounts, children }) => (
    <div class="content">
        <h1>{t('my_accounts category title')}</h1>
        <AccountList accounts={accounts}/>
        {children}
    </div>
)

export default translate()(CategoryList)
