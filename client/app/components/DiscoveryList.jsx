/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import UseCasesList from './UseCasesList'

const DiscoveryList = ({ t, useCases, context, children }) => (
  <div class='content'>
    <h1>{t('my_accounts discovery title')}</h1>
    <UseCasesList useCases={useCases} context={context} />
    {children}
  </div>
)

export default translate()(DiscoveryList)
