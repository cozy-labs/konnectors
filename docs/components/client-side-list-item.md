# List item component

The component [`list_item.vue`](../../client/app/components/list_item.vue) is a generic item for all lists used in the application such as konnectors or use cases lists. This document describes its data and all properties required and available for this component usage.

## Component structure

```pug
a.item-wrapper
    header
        svg.item-icon
            use
    p.item-title
    span.item-subtitle
```

## Usage example

```pug
//- After been imported as 'listItem'
//- The related icon path here is assets/icons/example.svg
list-item(
    title="My Item title",
    subtitle="My Item subtitle",
    backgroundCSS="blue",
    enableDefaultIcon="true",
    iconName="example",
    link="#")
```

> __Important__: This component is defined to work in a HTML parent element with `flex` as `display` CSS property.

## Props

### `title`
* __Required__
* __Type:__ String

Item's title or name.

### `link`
* __Required__
* __Type:__ String

Item's link, used when the user click on the item. It will be the `href` attribute of the `<a>` wrapper.

### `iconName`
* __Type:__ String

The name of the icon, from the [`assets/icons/`](../../client/assets/icons/) folder (SVG). If it's not provided, it will fallback to a default icon except if the `enableDefaultIcon` property (see below) is `false`. For this last case, the header will be displayed without icon.

### `subtitle`
* __Type:__ String

Item's subtitle.

### `backgroundCSS`
* __Type:__ String
* __Default:__ `'white'`

`background` css property value for the item header. This can be the exact same kind of values than the original `background` css property.

### `enableDefaultIcon`
* __Type:__ Boolean
* __Default:__ `false`

Boolean that can be used to disable the default icon display. If this property is false and if no `iconName` is provided, no icon will be displayed on the item header.


## Static data

### `headerBackground`
* __Type:__ Object

Object using the `backgroundCSS` property and returned with the format `{ background: backgroundCSS }`. This object is used for the header inline style.


## Computed data

### `icon`
* __Type:__ String

Icon (SVG) computed from the `iconName` property. If `iconName` is not provided, it will use the default icon, if enabled by the `enableDefaultIcon` property value.
> The fallback in this computed data also allows to catch potential `require()` exception, specially due to a not found icon.
