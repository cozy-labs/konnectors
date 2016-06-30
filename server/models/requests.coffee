# See documentation on https://github.com/frankrousseau/americano-cozy/#requests

americano = require 'americano'

module.exports =
    bill:
        byDate: americano.defaultRequests.by 'date'

    konnector:
        all: americano.defaultRequests.all

    bankoperation:
        byDate: americano.defaultRequests.by 'date'

    folder:
        byFullPath: (doc) -> emit "#{doc.path}/#{doc.name}", doc

    file:
        byFullPath: (doc) -> emit "#{doc.path}/#{doc.name}", doc

    steps:
        byDate: americano.defaultRequests.by 'date'

    sleep:
        byDate: americano.defaultRequests.by 'date'

    commit:
        byDate: americano.defaultRequests.by 'date'

    event:
        all: americano.defaultRequests.all
        bycaldavuri: americano.defaultRequests.by 'caldavuri'
        allLike: (doc) -> emit({
            start: doc.start,
            end: doc.end,
            tags: doc.tags,
            description: doc.description
        }, doc)

    tag:
        byName: (doc) -> emit doc.name, doc

    track:
        all: americano.defaultRequests.all