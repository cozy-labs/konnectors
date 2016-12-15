/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'

const AccountManagement = ({ t, router, connector }) => (
  <div class='accounts-management'>
    <div class='accounts-list'>
      <h3>Lorem ipsum</h3>
    </div>
    <div>
      <h3>{t('my_accounts account config title', {name: connector.name})}</h3>
    </div>
  </div>
)

export default translate()(withRouter(AccountManagement))
