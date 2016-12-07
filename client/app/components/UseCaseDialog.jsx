/** @jsx h */
import { h } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'
import AccountItem from './AccountItem'

const CloseButton = withRouter(({ router }) => (
  <div class='close-button' role='close' onClick={router.goBack} />
))

// Fallback to get the item background image and avoid error if not found
const getItemBackground = (item, context) => {
  let background = 'rgb(0, 130, 230)'
  if (item.figure && context) {
    try {
      let img = require(`../contexts/${context}/assets/img/${item.figure}`)
      background = `center/100% url(${img})`
    } catch (e) {
      background = 'rgb(0, 130, 230)'
    }
  }
  return background
}

const UseCaseDialog = ({ t, router, item, context }) => (
  <div role='dialog' class='use-case-dialog'>
    <div role='separator' onClick={router.goBack} />
    <div class='wrapper'>
      <div role='contentinfo'>
        <header
          class='dialog-header'
          style={{background: getItemBackground(item, context)}}
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
