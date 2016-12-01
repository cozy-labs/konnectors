import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import UseCasesList from './useCases_list'

const DiscoveryList = ({ t, useCases, children }) => (
    <div class="content">
        <h1>{t('my_accounts discovery title')}</h1>
          <UseCasesList useCases={useCases} />
          {children}
    </div>
)

export default translate()(DiscoveryList)
