import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'

const ConnectedList = ({ t }) => (
    <div class="content">
        <h1>{t('my_accounts connected title')}</h1>
        <article>{t('my_accounts coming_soon')}</article>
    </div>
)

export default translate()(ConnectedList)