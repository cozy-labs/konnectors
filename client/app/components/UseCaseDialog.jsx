/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import AccountItem from './AccountItem'

const CloseButton = withRouter(({ router }) => (
  <button role='close' onClick={router.goBack}>Close</button>
))

const UseCaseDialog = ({ t, item, context }) => (
  <div role='dialog'>
    <div class='wrapper'>
      <div role='contentinfo'>
        <header style={{background:
          `center/100% url(${require(`../contexts/${context}/assets/img/${item.figure}`)})`}}
        >
          <CloseButton />
        </header>
        <main>
          <h3>{t(`use-case ${item.slug} title`)}</h3>
          <p>{t(`use-case ${item.slug} description`)}</p>
          <div class='accounts-list'>
            {item.accounts.map(a =>
              <AccountItem
                title={a.name}
                subtitle={t(a.category + ' category')}
                iconName={a.slug}
                slug={a.slug}
                enableDefaultIcon
                backgroundCSS={a.color.css}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  </div>
)

export default translate()(UseCaseDialog)
