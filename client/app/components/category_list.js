import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import KonnectorItem from './konnector_item'

const CategoryList = ({ t, konnectors, children }) => (
    <div class="content">
        <h1>{t('my_accounts category title')}</h1>
        <div class="konnectors-list">
            {konnectors.map(k => 
                <KonnectorItem
                    title={k.name}
                    subtitle={t(k.category + ' category')}
                    iconName={k.slug}
                    slug={k.slug}
                    backgroundCSS={k.color.css}
                />
            )}            
        </div>
        {children}
    </div>
)

export default translate()(CategoryList)