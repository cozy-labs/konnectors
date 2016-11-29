import { h, Component } from 'preact'
import { Router } from 'preact-router'

import Sidebar from './components/sidebar'
import Discovery from './components/discovery'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'
import ItemDialog from './components/item_dialog'

export default class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            konnectors: props.konnectors,
            selectedItem: null
        }
        this.onItemSelect = this.onItemSelect.bind(this)
        this.onItemUnselect = this.onItemUnselect.bind(this)
    }

    onItemSelect(slug) {
        this.setState({
            selectedItem: this.state.konnectors.find(k => k.slug === slug)
        })
    }

    onItemUnselect() {
        this.setState({ selectedItem: null })
    }

    render({ t }, { konnectors, selectedItem }) {
        return (
            <div role="application">
                <Sidebar/>
                <main>
                    <div role="contentinfo">
                        <Router>
                            <Discovery path="/"/>
                            <CategoryList path="/category" konnectors={konnectors} onSelect={this.onItemSelect} />
                            <ConnectedList path="/connected"/>
                        </Router>
                    </div>
                </main>
                {selectedItem && <ItemDialog item={selectedItem} onClose={this.onItemUnselect} />}
            </div>
        )
    }
}
