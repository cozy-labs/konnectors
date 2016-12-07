/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'

import AccountConfigForm from './AccountConfigForm'

const CloseButton = withRouter(({ router }) => (
  <button role='close' onClick={router.goBack}>Close</button>
))

const AccountDialog = ({ t, item }) => (
  <div role='dialog'>
    <div class='wrapper'>
      <div role='contentinfo'>
        <header>
          <CloseButton />
          <h3>{item.name}</h3>
          <main>
            <div class=''>
              <AccountConfigForm fields={item.fields} slug={item.slug} />
            </div>
          </main>
          <footer />
        </header>
      </div>
    </div>
  </div>
)

export default translate()(AccountDialog)
