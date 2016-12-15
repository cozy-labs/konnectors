/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import ConnectorItem from './ConnectorItem'

const ConnectorList = ({ t, connectors }) => (
  <div class='connector-list'>
    {connectors.map(c =>
      <ConnectorItem
        title={c.name}
        subtitle={t(c.category + ' category')}
        iconName={c.slug}
        slug={c.slug}
        enableDefaultIcon
        backgroundCSS={c.color.css}
      />
    )}
  </div>
)

export default translate()(ConnectorList)
