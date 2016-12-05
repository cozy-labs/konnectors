/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountsList from './AccountsList'

const ConnectedList = ({ t, accounts, children }) => (
  <div class='content'>
    <h1>{t('my_accounts connected title')}</h1>
    <AccountsList accounts={accounts} />
    {children}
  </div>
)

export default translate()(ConnectedList)
