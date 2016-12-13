/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import ConnectorList from './ConnectorList'

const ConnectedList = ({ t, accounts, children }) => (
  <div class='content'>
    <h1>{t('my_accounts connected title')}</h1>
    <ConnectorList connectors={accounts} />
    {children}
  </div>
)

export default translate()(ConnectedList)
