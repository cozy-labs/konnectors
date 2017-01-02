
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
    name: 'My connector',
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

If a color property is not defined by the account connector, that will fallback to the default `hex` and `css` value which is `#A7B5C6`.

## Category

An account connector can define a category to be listed in. This category is single because a connector can not be listed in many different categories. Here is the connector category definition:

```javascript
// my_connector.js

    ...
    name: 'My connector',
    fields: ...
    models: ...
    ...

    category: 'health',
    ...
```

__⚠️ Important notes:__

The defined category must be authorized by the MyAccounts application in order to be listed in. You can see more about the authorized categories in the [MyAccounts server side configuration documentation](server-side-configuration.md).

If the account connector define a category which is authorized, it will be used. Otherwise, (if not 'valid' or not defined as well) that will fallback to the default name, which is `others`.

## Fields

An account connector can define different sort of fields for its configuration form in the app. Each field is represented by a type and can provide a default value in some cases. Here is a fields definition example:

```javascript
// my_connector.js

    ...
    name: 'My connector',
    fields: {
        login: { // no default value expected
            type: 'text'
        },
        password: { // no default value expected
            type: 'password'
        },
        email: {
            type: 'text',
            placeholder: 'example@domain.fr'
        },
        calendar: {
            type: 'text',
            default: 'My connector calendar',
            advanced: true
        },
        folderPath: {
            type: 'folder',
            default: '<my_accounts>/files',
            advanced: true
        },
        frequency: {
            type: 'dropdown',
            default: 'weekly',
            advanced: true,
            options: ['hourly', 'daily', 'weekly', 'monthly']
        },
        customField: {
            type: 'text',
            default: 'custom default value',
            advanced: true
        }
    }
```

### Field properties

* __`type`__ (mandatory): field type
* __`default`__ (optional): default value of the field (different from the placeholder)
* __`placeholder`__ (optional): placeholder for compatible input (text type for example)
* __`advanced`__ (optional): if true, this field will be considered as an advanced configuration field
* __`options`__ (__for dropdown type ONLY__): array of all options for the dropdown (`<select>` HTML)

### Field type property
Here are all types available for fields (most of them are [HTML input types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)):

* text (by default if the type is incorrect)
* password
* hidden
* url
* email
* tel
* dropdown: dropdown using the `<select>` HTML tag (need the `options` property to define the values list)
* folder: custom dropdown type that will render a specific field with folders values from the cozy-files app as options

### Available fields

* login (__no default value expected__)
* password (__no default value expected__)
* calendar
* folderPath
* frequency

But you can also use your own custom field like following:

```javascript
customField: {
    type: 'text',
    default: 'custom default value'
    // other field properties if needed
}
```

### Variables available for default value
These variables will be automatically replaced by the application at the configuration form display.

* __`<my_accounts>`__: Localized (translated) myAccounts app name
* __`<account>`__: Account name

### Fallbacks for default values

Some fields expect to have default values. If it's not the case, fallbacks will be used to get those. Here is the 'default value of these default value':

* folderPath: `<my_accounts>/<account>`
* calendar: `<account>`
* frequency:
    * `'weekly'` as default values
    * `['hourly', 'daily', 'weekly', 'monthly']` as default options

## Data types

A connector must specify which kinds of data it will be able to retrieve from its related service. These types are used to inform the user (information displayed on the connector modal) about his retrieved data when using a connector. Here is an example of data types declaration:

```javascript
// my_connector.js

    ...
    name: 'My connector',
    dataTypes: [
        'refund',
        'bill'
    ]
    ...
```

### Available types
Here is the list of dataTypes values that can be used when defining a connector:

* activity
* heartbeat
* calendar
* commit
* consumption
* contact
* contract
* travelDate
* event
* bill
* stepsNumber
* podcast
* weight
* bloodPressure
* appointment
* refund
* sleepTime
* courseMaterial
* temperature
* tweet

__⚠️ Important notes:__

If a declared data type is out of this list, it simplely won't be displayed in the related connector modal.
