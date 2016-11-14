## Define route

Add your route description here `client/app/routes.js`

```
// ...

SampleDialog = import SampleDialog from './components/examples/dialog'

{
  name: 'dialog',
  path: '/category/sample',
  component: SampleDialog
},

// ...
```

## Create a dialog window


### Step0. Inherit from layout

The component inherit from a layout that define area:
 - `content` is about main content (items list here),
 - `dialog` is about dialog window.
````
<template lang="pug">
    extends ../../templates/layout.pug

    // ...
</template>
````

### Step1. Add dialog markup
Add your markup into `block dialog`.
````
<template lang="pug">
    // ...

    block dialog
        div(aria-hidden='false', role='dialog')
            div(role='separator', v-on:click="closeWindow")
            .wrapper
                a(v-on:click="closeWindow", title='close') Fermer
                p hello
        </div>
</template>
````

### Step2. Display content above dialog window
Add your markup into `block content`.

````
<template lang="pug">
    extends ../../templates/layout.pug

    block content
        include ../../templates/category_list.pug

</template>
````

### Step3. Define behaviors
Add action into markup and add this method to your component.
````
<template lang="pug">
    // ...

    a(v-on:click="closeWindow", title='close') close window

    // ...
</template>

<script>
    export default {
        methods: {
            closeWindow () {
                this.$router.push({ name: 'categoryList'})
            }
        }
    }
</script>
````
