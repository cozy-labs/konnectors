import { h, render } from 'preact'
import { translate } from '../plugins/preact-polyglot'
import { withRouter } from 'react-router'

const CloseButton = withRouter(({ router }) => (
    <button role="close" onClick={router.goBack}>Close</button>
))

const ItemDialog = ({ t, item }) => (
    <div role="dialog">
        <div class="wrapper">
            <div role="contentinfo">
                <header>
                    <CloseButton/>
                    <h3>{item.name}</h3>
                    <main>
                        <p>Foo</p>
                    </main>
                    <footer>

                    </footer>
                </header>
            </div>
        </div>
        <h1>{t('my_accounts connected title')}</h1>
        <article>{t('my_accounts coming_soon')}</article>
    </div>
)


export default translate()(ItemDialog)