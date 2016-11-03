
---

# Cozy MyAccounts: Server side configuration

## Authorized categories list

The MyAccounts categories names list won't be automatically computed from available connectors in order to keep it clear and relevant for all Cozy users with a growing number of connectors.

Instead, they need to be configured on the served side, in a simple way, from a config file. This is a list of categories authorized to be used:

```javascript
{
    authorizedCategories:
        [
            'telecom',
            'isp',
            'energy',
            'host_provider',
            'productivity',
            'health',
            'social',
            'transport'
        ]
}
```

In an account connector's file, the category will just be defined like:

```javascript
// my_connector.js

    ...
    category: 'health',
    ...
```

If the account connector define a category available in the `authorizedCategories` object, it will be used. Otherwise, (if not 'valid' or not defined) that will fallback to the default category name which is `others`.
