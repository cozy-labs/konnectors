/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import UseCaseItem from './AccountItem'

const UseCasesList = ({ t, useCases }) => (
  <div class='use-cases-list'>
    {useCases.map(u =>
      <UseCaseItem
        title={t(u.slug)}
        slug={u.slug}
        enableDefaultIcon={false}
        backgroundCSS={`center/100% url('img/${u.figure}')`}
      />
    )}
  </div>
)

export default translate()(UseCasesList)
