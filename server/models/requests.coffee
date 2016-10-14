# See documentation on https://github.com/cozy/cozy-db

cozydb = require 'cozydb'

module.exports =
    bill:
        byDate: cozydb.defaultRequests.by 'date'

    konnector:
        all: cozydb.defaultRequests.all

    bankoperation:
        byDate: cozydb.defaultRequests.by 'date'

    folder:
        byFullPath: (doc) -> emit "#{doc.path}/#{doc.name}", doc

    file:
        byFullPath: (doc) -> emit "#{doc.path}/#{doc.name}", doc

    steps:
        byDate: cozydb.defaultRequests.by 'date'

    sleep:
        byDate: cozydb.defaultRequests.by 'date'

    commit:
        byDate: cozydb.defaultRequests.by 'date'

    event:
        all: cozydb.defaultRequests.all
        bycaldavuri: cozydb.defaultRequests.by 'caldavuri'
        allLike: (doc) -> emit({
            start: doc.start,
            end: doc.end,
            tags: doc.tags,
            description: doc.description
        }, doc)

    tag:
        byName: (doc) -> emit doc.name, doc

    track:
        all: cozydb.defaultRequests.all
