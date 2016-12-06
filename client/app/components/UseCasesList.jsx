/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import UseCaseItem from './AccountItem'

const UseCasesList = ({ t, useCases, context }) => (
  <div class='use-cases-list'>
    {useCases.map(u =>
      <UseCaseItem
        title={t(`use-case ${u.slug} title`)}
        slug={u.slug}
        enableDefaultIcon={false}
        backgroundCSS={
          `center/100% url(${require(`../contexts/${context}/assets/img/${u.figure}`)})`
        }
      />
    )}
  </div>
)

export default translate()(UseCasesList)
