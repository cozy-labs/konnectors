should = require 'should'
moment = require 'moment'
log = require('printit')
    prefix: 'test naming'

naming = require '../server/lib/naming'

today = moment()

entry =
    date: today
    orderId: '123456'
    travel: 'paris_lyon'


describe '', ->

    before ->

    describe 'parameters is string', ->

        it 'output should have a date', ->
            todayPrefix = today.format 'YYYYMM'
            name = naming.getEntryFileName entry, 'telecom'
            name.should.equal "#{todayPrefix}_telecom.pdf"

    describe 'parameters is an object', ->

        it 'with parametered vendor', ->
            todayPrefix = today.format 'YYYYMM'
            name = naming.getEntryFileName entry,
                vendor: 'telecom'
            name.should.equal "#{todayPrefix}_telecom.pdf"

        it 'with parametered date', ->
            todayPrefix = today.format 'YYYYMMDD'
            name = naming.getEntryFileName entry,
                vendor: 'telecom'
                dateFormat: 'YYYYMMDD'
            name.should.equal "#{todayPrefix}_telecom.pdf"

        it 'with extension parameters', ->
            todayPrefix = today.format 'YYYYMM'
            name = naming.getEntryFileName entry,
                vendor: 'telecom'
                extension: 'txt'
            name.should.equal "#{todayPrefix}_telecom.txt"

        it 'with other parameters', ->
            todayPrefix = today.format 'YYYYMM'
            name = naming.getEntryFileName entry,
                vendor: 'telecom'
                others: ['orderId', 'travel']
            name.should.equal "#{todayPrefix}_telecom_123456_paris_lyon.pdf"

        it 'with all parameters', ->
            todayPrefix = today.format 'YYYYMMDD'
            name = naming.getEntryFileName entry,
                vendor: 'telecom'
                dateFormat: 'YYYYMMDD'
                extension: 'txt'
                others: ['orderId', 'travel']
            name.should.equal "#{todayPrefix}_telecom_123456_paris_lyon.txt"

