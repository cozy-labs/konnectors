# DialogComponent

## Integration in 2 steps

### Step 1: create your own component

In an external file, such as: [`client/app/components/konnectors/example.vue`](client/app/components/konnectors/example.vue)

```
<template lang="pug">
    // Dialog basic layout is defined here
    extends ../../templates/dialog.pug

    // Override header here
    block dialog_header
        p header sample

    // Override content here
    block dialog_content
        p dialog free content

    // Override footer here
    block dialog_footer
        button(v-on:click="addError", title='display error')
            | display error
        button(v-on:click="onClose", title='cancel')
            | cancel
        button(v-on:click="onSuccess", title='OK')
            | next
</template>

<script>
    export default {
        // List of properties inherited from parent
        // if not defined, properties will be `undefined`
        // into template above
        props: [
          'onClose',
          'onSuccess',
          'onError',
          'headerStyles'],

        methods: {
            // You can create specific methods
            // only needed in this dialog component
            addError () {
                this.onError('this is a notification error')
            }
        }
    }
</script>

// ...
```

### Step 2: configure into `client/app/app.vue`

```

// ...
<script>
    // Call external dialogComponent
    // Each should be imported here
    // or create one specific config file per component
    //
    // // ie. for a componenet called `konnector`
    // import KonnectorConfig from `./app/config/konnector.js`
    // Dialogs.push(KonnectorConfig)
    import ExampleKonnector from './components/konnectors/example'

    const Dialogs = [{
        id: 'dialog-1',
        headerImage: 'test0.png',
        content: ExampleKonnector,
        success: {
            route: { name: 'create-account-success' }
        }
    }]

    // ...
</script>
```

## Events

### Global events

Note: This are hypothetical use cases because none `Notifications` or `DialogContentComponent` are yet displayed.

#### onCloseDialog
see into [source](https://github.com/misstick/konnectors/blob/5463718a9e2306a80b50c71840545032a38cc9d4/client/app/app.vue#L128)

#### onSuccessDialog

##### Use case 1
This listener can display success notification from `DialogContentComponent`.

see into [source](https://github.com/misstick/konnectors/blob/5463718a9e2306a80b50c71840545032a38cc9d4/client/app/app.vue#L133)

##### Use case 2
This also can redirect throw a next step.

see into [source](https://github.com/misstick/konnectors/blob/5463718a9e2306a80b50c71840545032a38cc9d4/client/app/app.vue#L55)


#### onErrorDialog
This listener can display error notification from `DialogContentComponent`.

see into [source](https://github.com/misstick/konnectors/blob/5463718a9e2306a80b50c71840545032a38cc9d4/client/app/app.vue#L143)


### Contextual events
Handle your component own behaviour [here](https://github.com/cozy-labs/konnectors/pull/580/files#diff-4e62f2042faed3eeebc7c087c00643a9R28).


### Bubbling events
`DialogComponentListener` are binded into your own `DialogContentComponent` properties; call them just like [that](https://github.com/cozy-labs/konnectors/pull/580/files#diff-4e62f2042faed3eeebc7c087c00643a9R30).


## API

### Dialog.id
`(String)`

### <a name="dialog_headerImage"></a>Dialog.headerImage `ImagePath`
Inline CSS used to personalize DialogHeader.
They are defined [here](https://github.com/misstick/konnectors/blob/9496e1ed1abbf7e46d5e77996a46970c43059350/client/app/components/dialog.vue#L20).


### <a name="dialog_content"></a>Dialog.content `VueComponent`
The content is called into [`DialogComponent`](https://github.com/misstick/konnectors/blob/9496e1ed1abbf7e46d5e77996a46970c43059350/client/app/components/dialog.vue#L17).


### <a name="dialog_success_route"></a> Dialog.success.route `(optional)``VueRoute`
Redirection for a next step.
For more information see [the route object reference](http://router.vuejs.org/en/api/route-object.html).
