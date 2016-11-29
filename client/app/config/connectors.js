import ExampleKonnector from '../components/konnectors/example'

const Connectors = {
    'dialog-1': {
        title: "dialog title",

        headerStyles: {
            'background-image': `url(header.png)`,
            'height': '100px'
        },

        component: ExampleKonnector,

        routes: {
            success: { name: 'create-account-success' }
        },

        // Handle Events emitted
        // from dialogsVue to appVue
        //hub: new Vue()
    }
}

export { ExampleKonnector, Connectors }