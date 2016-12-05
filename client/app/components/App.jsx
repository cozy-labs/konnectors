/** @jsx h */
import { h } from 'preact'

import { I18n } from '../plugins/preact-polyglot'

import Sidebar from './Sidebar'

const App = ({ context, lang, categories, children }) => (
  <I18n context={context} lang={lang}>
    <div role='application'>
      <Sidebar categories={categories} />
      <main>
        <div role='contentinfo'>
          {children}
        </div>
      </main>
    </div>
  </I18n>
)

export default App
