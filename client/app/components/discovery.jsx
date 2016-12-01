import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'

const Discovery = ({ t }) => (
    <div class="content">
        <h1>{t('my_accounts discovery title')}</h1>
        <article>{t('my_accounts coming_soon')}</article>
    </div>
)

export default translate()(Discovery)
