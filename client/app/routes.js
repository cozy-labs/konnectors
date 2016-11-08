import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

export default [{
  path: '/category',
  component: CategoryList
},
{
  path: '/discovery',
  component: DiscoveryList
},
{
  path: '/connected',
  component: ConnectedList
},
{
  path: '/',
  redirect: '/discovery'
}]
