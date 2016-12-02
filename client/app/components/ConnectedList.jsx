import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountsList from './AccountsList'

const ConnectedList = ({ t, accounts, children }) => (
    <div class="content">
        <h1>{t('my_accounts connected title')}</h1>
        <AccountsList accounts={filterConnected(accounts)} />
        {children}
    </div>
)

const filterConnected = (accounts) =>
  accounts.filter(a => a.accounts.length !== 0)

export default translate()(ConnectedList)
