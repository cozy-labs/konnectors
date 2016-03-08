should = require 'should'

baseKonnector = require '../server/lib/base_konnector'
Bill = require '../server/models/bill'
Event = require '../server/models/event'
Konnector = require '../server/models/konnector'


describe 'Base Konnector', ->

    data1 = false
    data2 = false

    konnector = baseKonnector.createNew
        name: 'Test name'
        fields:
            login: 'text'
        models: [Bill, Event]
        fetchOperations: [
            (requiredFields, result, data, next) ->
                data1 = true
                next()
        ,
            (requiredFields, result, data, next) ->
                data2 = true
                result.notifContent = 'Success'
                next()
        ]

    describe 'generates automically:', ->

        it 'slug', ->
            konnector.slug.should.equal 'test_name'

        it 'description', ->
            konnector.description.should.equal 'konnector description test_name'

        it 'logger', ->
            should.exist konnector.logger
            konnector.logger.options.prefix.should.equal.name

        it 'model map', ->
            should.exist konnector.models.event
            konnector.models.event.displayName.should.equal 'Event'
            should.exist konnector.models.bill
            konnector.models.bill.displayName.should.equal 'Bill'

        it 'fetch function (based on operations)', (done) ->
            konnector.fetch konnector.requiredFields, (err, notifContent) ->
                should.not.exist err
                data1.should.be.ok
                data2.should.be.ok
                notifContent.should.equal 'Success'

                done()

