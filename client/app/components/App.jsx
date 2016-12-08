/** @jsx h */
import { h } from 'preact'

import Sidebar from './Sidebar'

const App = ({ categories, children }) => (
  <div role='application'>
    <Sidebar categories={categories} />
    <main>
      <div role='contentinfo'>
        {children}
      </div>
    </main>
  </div>
)

export default App
