import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import KonnectorItem from './konnector_item'

const CategoryList = ({ t, konnectors, onSelect }) => (
    <div class="content">
        <h1>{t('my_accounts category title')}</h1>
        <div class="konnectors-list">
            {konnectors.map(k => 
                <KonnectorItem
                    title={k.name}
                    slug={k.slug}
                    onClick={onSelect}
                    backgroundCSS={k.color.css}
                    />
            )}            
        </div>
    </div>
)

export default translate()(CategoryList)