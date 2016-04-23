should = require 'should'
Konnector = require '../server/models/konnector'

describe 'Injecting/Removing encrypted fields', ->

    describe 'Injecting fields', ->
        it 'When I call injectEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: "myname"
                ]
                password: '[{"password": "azerty"}]'
            @fields =
                username: "text"
                password: "password"
            @konnector.injectEncryptedFields()

        it 'then the fields Values should be completely filled', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                accountKeys.should.containEql name

    describe 'Injecting fields [multiple passwords]', ->
        it 'When I call injectEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: "myname"
                ]
                password: '[{"pass": "azerty", "key": "qwerty"}]'
            @fields =
                username: "text"
                pass: "password"
                key: "password"
            @konnector.injectEncryptedFields()

        it 'then the fields Values should be completely filled', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                accountKeys.should.containEql name

    describe 'Injecting fields [multi accounts]', ->
        it 'When I call inject encrypted fields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: 'myname'
                ,
                    username: 'myname2'
                ]
                password: '[{"pass": "azerty"},{"pass": "azerty"}]'
            @fields =
                username: "text"
                pass: "password"
                key: "password"
            @konnector.injectEncryptedFields()

        it 'then the fields Values should be completely filled', ->
            for account in @konnector.accounts[0]
                accountKeys = Object.keys accounts
                for name, value of @fields
                    accountKeys.should.containEql name


    describe 'Removing fields', ->

        it 'When I call removeEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: "myname"
                    password: "azerty"
                ]
                password: '[{"password": "azerty"}]'
            @fields =
                username: "text"
                password: "password"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                if value is 'password'
                    accountKeys.should.not.containEql name

        it 'and the password field should be filled', ->
            expected = JSON.stringify [password: 'azerty']
            @konnector.password.should.equal expected

    describe 'Removing fields [multiple passwords]', ->

        it 'When I call removeEncryptedFields on the connector object', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: "myname"
                    pass1: "azerty"
                    pass2: "qwerty"
                ]
                password: '[{"pass1": "azerty", "pass2": "qwerty"}]'
            @fields =
                username: "text"
                pass1: "password"
                pass2: "password"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                if value is 'password'
                    accountKeys.should.not.containEql name

        it 'and the password field should be filled', ->
            expected = JSON.stringify [pass1: 'azerty', pass2: 'qwerty']
            @konnector.password.should.equal expected

    describe 'Empty fields', ->
        it 'When I call removeEncryptedFields and the password is empty', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [
                    username: "test"
                    password: "pass"
                ]
                password: '[{}]'
            @fields =
                username: "text"
                password: "password"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password anymore', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                if value is 'password'
                    accountKeys.should.not.containEql name

        it 'and the password field should be filled', ->
            expected = JSON.stringify [password: 'pass']
            @konnector.password.should.equal expected

    describe 'Missing password fields', ->
        it 'when I call removeEncryptefFields with no password field', ->
            @konnector = new Konnector
                slug: 'test'
                accounts: [username: "test"]
                password: '[{}]'
            @fields = username: "text"
            @konnector.removeEncryptedFields @fields

        it 'then the fields Values should not contain any password', ->
            accountKeys = Object.keys @konnector.accounts[0]
            for name, value of @fields
                if value is 'password'
                    accountKeys.should.not.containEql name
        it 'and the password field should not be empty', ->
            expected = '[{}]'
            @konnector.password.should.equal expected

