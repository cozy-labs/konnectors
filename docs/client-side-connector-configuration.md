
---

# Cozy MyAccounts: Connector configuration

## Color

The account connector can define a simple color or a gradient color to be used when displayed (for example as background). Here, it's important to know that the property is not a simple color but a css property. It's why the account connector color property will be defined like an object.

We keep a simple color definition in all cases, because if we have a gradient as background, we can also need a simple for others interface elements (borders, customized svg...).

For a simple color account connector:

```javascript
// my_connector.js

    ...
    color: {
        // the simple color hexadecimal definition
        hex: '#A7B5C6',
        // property used to display the connector background in the modal,
        // could be different from the hexColor property
        css: '#A7B5C6'
    }
    ...
```

For a 'complex' color account connector:

```javascript
// my_connector.js

    ...
    name: "My connector"
    fields: ...
    models: ...
    ...

    color: {
        // a default simple color still available, eventually for other usages
        hex: '#9E0017',
        // css property for linear gradient
        css: 'linear-gradient(90deg, #EF0001 0%, #9E0017 100%)'
    }
    ...
```

If a color property is not defined by the account connector, that will fallback to the default ```hex``` and ```css``` value which is ```#A7B5C6```.

## Category

An account connector can define a category to be listed in. This category is single because a connected can not be listed in many different categories. Here is the connector category definition:

```javascript
// my_connector.js

    ...
    name: "My connector"
    fields: ...
    models: ...
    ...

    category: 'health',
    ...
```

__⚠️ Important notes:__

The defined category must be authorized by the MyAccounts application in order to be listed in. You can see more about the authorized categories in the [MyAccounts server side configuration documentation](server-side-configuration.md).

If the account connector define a category which is authorized, it will be used. Otherwise, (if not 'valid' or not defined as well) that will fallback to the default name, which is ```others```.
