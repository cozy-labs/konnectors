/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'

const CloseButton = withRouter(({ router }) => (
  <button role='close' onClick={router.goBack}>Close</button>
))

const UseCaseDialog = ({ t, item }) => (
  <div role='dialog'>
    <div class='wrapper'>
      <div role='contentinfo'>
        <header>
          <CloseButton />
          <h3>{item.slug}</h3>
          <main>
            <p>Foo</p>
          </main>
          <footer />
        </header>
      </div>
    </div>
  </div>
)

export default translate()(UseCaseDialog)
