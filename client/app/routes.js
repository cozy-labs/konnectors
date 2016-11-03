import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

export default [
  {
    path: '/category',
    component: CategoryList
  },
  {
    path: '/discovery',
    alias: '/',
    component: DiscoveryList
  },
  {
    path: '/connected',
    component: ConnectedList
  }
]
