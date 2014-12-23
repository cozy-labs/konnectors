should = require 'should'
Isen = require '../server/konnectors/isen'

describe 'Testing ISEN konnector', ->

    describe 'Fetch', ->
        it 'When I launch an import with the isen connector', (done) ->
            @timeout 200000
            requiredFields =
                firstname: "test"
                lastname: "test"
            Isen.fetchIcs requiredFields, (err) ->
                console.log err if err
                done()
