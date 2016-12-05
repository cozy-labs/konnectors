/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountItem from './AccountItem'

const AccountsList = ({ t, accounts }) => (
  <div class='accounts-list'>
    {accounts.map(a =>
      <AccountItem
        title={a.name}
        subtitle={t(a.category + ' category')}
        iconName={a.slug}
        slug={a.slug}
        enableDefaultIcon
        backgroundCSS={a.color.css}
      />
    )}
  </div>
)

export default translate()(AccountsList)
