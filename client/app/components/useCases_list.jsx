import { h, Component } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import UseCaseItem from './account_item'

const AccountList = ({ t, useCases }) => (
    <div class="use-cases-list">
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

export default translate()(AccountList)
