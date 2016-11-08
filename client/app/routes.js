import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'
import SampleDialog from './components/examples/dialog'

export default [{
  path: '/category',
  component: CategoryList
},
{
  path: '/category/sample',
  component: SampleDialog
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
