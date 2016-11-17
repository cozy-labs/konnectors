# DialogComponent

## Integration in 2 steps

### Step 1: create your own component

In an external file, such as: [`client/app/components/konnectors/example.vue`](../client/app/components/konnectors/example.vue)

```
<template lang="pug">
    // Override content here
    p dialog free content
</template>

<script>
    // Add your behaviors here
</script>
```

Note: Dialog layout is defined into [`client/app/app.vue`](../client/app/app.vue#L6)

### Step 2: configure into `client/app/app.vue`

```
<script>
    // ...

    //
    // Handle use case:
    // when adding real dialogs this declaration
    // will be very obscure and un-readable
    //
    // TODO:
    // create a directory `./config/myDialog.js`
    // and then import it into (Array)Dialogs
    //
    import ExampleKonnector from './components/konnectors/example'

    const Dialogs = [{
        id: 'dialog-1',

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
        hub: new Vue()
    }]

    // ...
</script>
```

## Use cases

Note: This are hypothetical use cases because none `Notifications` or `DialogContentComponent` are yet displayed.

### Add a custom `<header>` or `<footer>`
Both content are defined into `client/app/app.vue` ([here](../client/app/app.vue#L14) and [here](../client/app/app.vue#L18)).

These content are common to all dialogs from `app.dialogs`. If you want several kinds of dialogs layout, you will have to create an other `Array` property different than `app.dialogs` (you should adapt existing code before `app.methods` only care about `app.dialogs`).

For more information have a look to `vuejs` [documentation](https://vuejs.org/v2/guide/components.html#Content-Distribution-with-Slots)


### Display a notification
If you want to display a `SuccessNotification` you can handle this [here](../client/app/app.vue#L163)


### Success redirection
Configure [here](../client/app/app.vue#L55)
Called [here](../client/app/app.vue#L170).


### Bubbling events
Events are emitted from your own component to application throw `dialog.hub`

ie: Add a [close button](../client/app/app.vue#L20) into footer
```
    button(@click="dialog.hub.$emit('close')") Cancel
```

Handle your component own behaviour [here](../client/app/components/konnectors/example.vue).


## API

### onCloseDialog `Event`
see into [source](../client/app/app.vue#L153)

### onSuccessDialog `Event`


### onErrorDialog `Event`
This listener can display error notification from `DialogContentComponent`.

see into [source](../client/app/app.vue#L174)


### Dialog.id `String`

### Dialog.hub `VueComponent`
Handle all events emitted from `DialogVue` to `ApplicationVue`.

### <a name="dialog_headerStyles"></a>Dialog.headerStyles `Object`
CSS styles needed to personalize DialogHeader.

### <a name="dialog_component"></a>Dialog.component `VueComponent`
The content is called into `AppComponent` [here](../client/app/app.vue#L16).


### <a name="dialog_routes_success"></a> Dialog.routes.success `(optional)``VueRoute`
Redirection for a next step.
For more information see [the route object reference](http://router.vuejs.org/en/api/route-object.html).
