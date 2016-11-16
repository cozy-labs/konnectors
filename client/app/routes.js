import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

export default [{
  name: 'categoryList',
  path: '/category',
  component: CategoryList
},
{
  name: 'discoveryList',
  path: '/discovery',
  component: DiscoveryList
},
{
  name: 'connectedList',
  path: '/connected',
  component: ConnectedList
},
{
  name: 'default',
  path: '/',
  redirect: '/discovery'
}]
