should = require 'should'
Konnector = require '../server/models/konnector'

describe 'Injecting/Removing encrypted fields', ->

    describe 'Injecting fields', ->
        it 'When I call injectEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                fieldValues:
                    username: "myname"
                password: '{"password": "azerty"}'
            @fields =
                username: "text"
                password: "password"
            @konnector.injectEncryptedFields()

        it 'then the fields Values should be completely filled', ->
            fieldValuesKeys = Object.keys @konnector.fieldValues
            for name, value of @fields
                fieldValuesKeys.should.containEql name

    describe 'Removing fields', ->

        it 'When I call removeEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                fieldValues:
                    username: "myname"
                    password: "azerty"
                password: '{"password": "azerty"}'
            @fields =
                username: "text"
                password: "password"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password', ->
            fieldValuesKeys = Object.keys @konnector.fieldValues
            for name, value of @fields
                if value is 'password'
                    fieldValuesKeys.should.not.containEql name

        it 'and the password field should be filled', ->
            expected = JSON.stringify password: 'azerty'
            @konnector.password.should.equal expected

    describe 'Empty fields', ->
        it 'When I call removeEncryptedFields and the password is empty', ->
            @konnector = new Konnector
                slug: 'test'
                fieldValues:
                    username: "test"
                    password: "pass"
                password: '{}'
            @fields =
                username: "text"
                password: "password"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password anymore', ->
            fieldValuesKeys = Object.keys @konnector.fieldValues
            for name, value of @fields
                if value is 'password'
                    fieldValuesKeys.should.not.containEql name

        it 'and the password field should be filled', ->
            expected = JSON.stringify password: 'pass'
            @konnector.password.should.equal expected

    describe 'Missing password fields', ->
        it 'when I call removeEncryptefFields with no password field', ->
            @konnector = new Konnector
                slug: 'test'
                fieldValues: username: "test"
                password: '{}'
            @fields = username: "text"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password', ->
            fieldValuesKeys = Object.keys @konnector.fieldValues
            for name, value of @fields
                if value is 'password'
                    fieldValuesKeys.should.not.containEql name
        it 'and the password field should not be empty', ->
            expected = '{}'
            @konnector.password.should.equal expected
