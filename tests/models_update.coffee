should = require 'should'
moment = require 'moment'
log = require('printit')
    prefix: 'test convertion'

Konnector = require '../server/models/konnector'
baseKonnector = require '../server/lib/base_konnector'
today = moment()


describe 'Convertion konnector models field values from < 0.6 to >= 0.6', ->

    describe 'Field convertion', ->

        it 'fieldValues field => accounts field', ->
            konnector = baseKonnector.createNew
                name: 'test'
                fields:
                    login: 'text'
                    password: 'password'
                models: []
                fieldValues:
                    login: 'login'
                    password: 'pass'
                fetchOperations: []
            konnector = new Konnector konnector
            konnector.cleanFieldValues()

            should.not.exist konnector.fieldValues
            konnector.accounts.should.eql [
                login: 'login'
                password: 'pass'
            ]

        it 'Single password field => multiple account field', ->
           konnector = baseKonnector.createNew
                name: 'test'
                fields:
                    login: 'text'
                    password: 'password'
                models: []
                fieldValues:
                    login: 'login'
                password: '{"password":"pass"}'
                fetchOperations: []
            konnector = new Konnector konnector
            konnector.cleanFieldValues()
            konnector.password.should.equal '[{"password":"pass"}]'

