should = require 'should'
Konnector = require '../server/models/konnector'

describe 'Injecting/Removing encrypted fields', ->
        describe 'Injecting fields', ->
                before ->
                        @konnector = new Konnector
                                slug: 'test'
                                fieldValues:
                                        username: "myname"
                                password: '{"password": "azerty"}'
                        @fields =
                                username: "text"
                                password: "password"
                        @konnector.injectEncryptedFields()

                describe 'When I call injectEncryptedFields on the connector object', ->
                        it 'then the fields Values are completely filled', ->
                                fieldValuesKeys = Object.keys @konnector.fieldValues
                                for name, value of @fields
                                        fieldValuesKeys.should.containEql name

        describe 'Removing fields', ->
                
                describe 'When I call removeEncryptedFields on the connector object', ->
                        before ->
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


                        it 'then the fields Values are not containing any password', ->
                                #console.log @konnector
                                fieldValuesKeys = Object.keys @konnector.fieldValues
                                for name, value of @fields
                                        if value is 'password'
                                                fieldValuesKeys.should.not.containEql name

                        it 'then the password field is filled', ->
                                expected = JSON.stringify password: 'azerty'
                                @konnector.password.should.equal expected

                describe 'when the password field is empty', ->
                        before ->
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
                        it 'then the fields Values are not containing any password', ->
                                fieldValuesKeys = Object.keys @konnector.fieldValues
                                for name, value of @fields
                                        if value is 'password'
                                                fieldValuesKeys.should.not.containEql name
                        it 'then the password field is filled', ->
                                expected = JSON.stringify password: 'pass'
                                @konnector.password.should.equal expected

                describe 'when there is no  password field', ->
                        before ->
                                @konnector = new Konnector
                                        slug: 'test'
                                        fieldValues: username: "test"
                                        password: '{}'
                                @fields = username: "text"
                                @konnector.removeEncryptedFields @fields
                        it 'then the fields Values are not containing any password', ->
                                fieldValuesKeys = Object.keys @konnector.fieldValues
                                for name, value of @fields
                                        if value is 'password'
                                                fieldValuesKeys.should.not.containEql name
                        it 'then the password field is filled', ->
                                expected = '{}'
                                @konnector.password.should.equal expected

