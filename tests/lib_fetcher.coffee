fetcher = require '../server/lib/fetcher'
should = require 'should'


describe 'Fetcher', ->


    before ->
        @fetcher = fetcher.new()
        @counter = 0


    it 'adds two layers', ->

        layer1 = (arg1, arg2, callback) =>
            @counter++
            arg1.name = "layer1"
            callback()

        layer2 = (arg1, arg2, callback) =>
            @counter += 2
            arg1.name += " and layer2"
            arg2.name = "layer2"
            callback()

        @fetcher.use layer1
        @fetcher.use layer2
        @fetcher.getLayers().length.should.equal 2


    it 'fetching executes layers that share same arguments', (done) ->
        arg1 = {}
        arg2 = {}
        @fetcher.args arg1, arg2
        @fetcher.fetch =>
            @counter.should.equal 3
            arg1.name.should.equal "layer1 and layer2"
            arg2.name.should.equal "layer2"
            done()

