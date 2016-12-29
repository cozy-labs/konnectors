# See documentation on https://github.com/cozy/cozy-db

cozydb = require 'cozydb'

module.exports =
    bill:
        byDate: cozydb.defaultRequests.by 'date'
        byVendor: cozydb.defaultRequests.by 'vendor'

    konnector:
        all: cozydb.defaultRequests.all
        bySlug: cozydb.defaultRequests.by 'slug'

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

    client:
        all: cozydb.defaultRequests.all

    contract:
        all: cozydb.defaultRequests.all

    paymentterms:
        all: cozydb.defaultRequests.all

    home:
        all: cozydb.defaultRequests.all

    consumptionstatement:
        all: cozydb.defaultRequests.all

    maifuser:
        all: cozydb.defaultRequests.all

    geopoint:
        all: cozydb.defaultRequests.all

    phonecommunicationlog:
        all: cozydb.defaultRequests.all

    videostream:
        all: cozydb.defaultRequests.all
