/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import AccountItem from './AccountItem'

const ConnectorList = ({ t, connectors }) => (
  <div class='connector-list'>
    {connectors.map(a =>
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

export default translate()(ConnectorList)
