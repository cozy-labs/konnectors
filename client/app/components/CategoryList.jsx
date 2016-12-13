/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountsList from './AccountsList'

const CategoryList = ({ t, category, accounts, children }) => (
  <div class='content'>
    <h1>{category === 'all' ? t('my_accounts category title') : t(`${category} category`)}</h1>
    <AccountsList accounts={accounts} />
    {children}
  </div>
)

export default translate()(CategoryList)
