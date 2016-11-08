import DiscoveryList from './components/discovery_list'
import CategoryList from './components/category_list'
import ConnectedList from './components/connected_list'

import SampleDialog from './components/examples/dialog'
import SampleDialogSuccess from './components/examples/dialog_success'
import SampleDialogError from './components/examples/dialog_error'

export default [{
  name: 'categoryList',
  path: '/category',
  component: CategoryList
},
{
  name: 'dialog',
  path: '/category/sample',
  component: SampleDialog
},
{
  name: 'dialogError',
  path: '/category/sample/error',
  component: SampleDialogError
},
{
  name: 'dialogSuccess',
  path: '/category/sample/success',
  component: SampleDialogSuccess
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
