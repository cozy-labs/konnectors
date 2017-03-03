# Konnector declaration proposition in V3 (Gozy)

With the cozy architecture changes, the konnectors will also need some adaptation to work in the V3. The goal here is to show
to the community a proposition of declaration of a konnector in the new stack. This proposition is still to be discussed and all
remarks are welcome.

## Constraints

- For legal reasons, we need to separate the konnectors so that the user needs to decide himself to install a konnector
  and not the whole package (like the applications).
- We want to propose a curated list of konnectors, but we also want to let the user install konnectors from other
  sources (github repos at the moment)
- The konnectors will be executed into a container with the last LTS nodejs version (maybe 8) with cozy-client-js giving access to the cozy stack and with access to internet (of course!)

## Proposition

 - The konnectors will be installed using git.
 - A konnector package will need the following items :
    - An index.js (or any file referenced by "main" section of package.json) which will be run by the stack in a securised container
    - The dependencies need to be bundled and built with it (no dependencies are installed by the stack)
    - a cozy-client-js served and updated by the stack will be accessible to the main file.
    - shared dependencies (the server/lib and server/models directories) will be copied by the stack in the konnector repository
      and will be updated to be compatible with the stack, which will allow a good compatibility with previous versions of
      konnectors.
    - A manifest.konnector will have to filled by the developper with the following structure :

```
{
  "version": "1.0.0",
    "name": "Trainline",
    "type": "node",
    "icon": "./trainline.svg"
    "slug": "trainline",
    "description": "Get all the bill from trainline",
    "source": "https://github.com/cozy/trainline@build",
    "locales": {
      "fr": {
        description: "Récupère toutes vos factures trainline",
        permissions: {
          "bills": {
            "description": "Utilisé pour sauvegarder les données de facturation",
          },
          "files": {
            "description": "Utilisé pour sauvegarder les pdf des factures",
          }
        }
      }
    },
    "permissions": {
      "bills": {
        "description": "Required to save the bills data",
        "type": "io.cozy.bills",
      },
      "files": {
        "description": "Required to save the bills pdf",
        "type": "io.cozy.files",
      },
    },
    "developer": {
      "name": "Your name or organization",
      "url": "http://your-homepage-here.org"
    }
}
```

The "node" type is the default type of konnector (and the only one at the moment). It may be
possible in the future to propose weboob konnectors for example.

 - Since the konnectors will be needed to be in their own repository, we will propose to the maintainers to create their own repository with
 their konnector or else it will be created in cozy-labs, I suppose.



