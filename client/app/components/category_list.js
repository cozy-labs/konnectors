import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'

const CategoryList = ({ t }) => (
    <div class="content">
        <h1>{t('my_accounts category title')}</h1>
        <article>{t('my_accounts coming_soon')}</article>
    </div>
)

export default translate()(CategoryList)