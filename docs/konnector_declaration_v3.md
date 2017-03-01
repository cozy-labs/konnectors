# Konnector declaration proposition in V3 (Gozy)

With the cozy architecture change, the konnectors will also need some adaptation to work in the V3. The goal here is to show
to the community a proposition of declaration of a konnector in the new stack. This proposition is still to be discussed and all
remarks are welcome.

## Constraints

- For legal reasons, we need to separate the konnectors so that the user needs to decide himself to install a konnector
  and not the whole package (like the applications).
- We want to propose a curated list of konnectors, but we also want to let the user install konnectors from other
  sources (github, npm, etc)
- The konnectors will be executed in a container with the last LTS nodejs version (6 at the moment) with cozy-client-js giving access to the cozy stack and with access to internet (of course!)

## Proposition

 - The konnectors will be installed using npm. Any source usable by npm is possible : github, gist, gitlab, bitbucket (git)
   or a tar.gz somewhere on the internet (but not file addresse). More information here : https://docs.npmjs.com/cli/install
 - A konnector package will need the following items :
    - An index.js which will be run by the stack in a securised container
    - The dependencies need to be bundled an built with it (no dependencies are installed by the stack)
    - a cozy-client-js served and updated by the stack will be accessible to the index.js file.
    - shared dependencies (the server/lib and server/models directories) will be copied by the stack in the konnector repository
      and will be updated to be compatible with the stack, which will allow a good compatibility with previous versions of
      konnectors.
    - A manifest.konnector will have to filled by the developper with the following structure :

```
{
  "version": "1.0.0",
    "name": "Trainline",
    "slug": "trainline"
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
        "verbs": ["GET", "POST"]
      },
      "files": {
        "description": "Required to save the bills pdf",
        "type": "io.cozy.files",
        "verbs": ["GET", "POST"]
      },
    },
    "developer": {
      "name": "Your name or organization",
      "url": "http://your-homepage-here.org"
    }
}
```

 - Since the konnectors will needed to be in their own repository. We will propose to the maintainers to create their own repository with
 their konnector or else it will be created in cozy-labs, I suppose.



