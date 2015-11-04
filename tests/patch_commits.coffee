async = require 'async'
should = require 'should'

patch = require '../server/init/patch_commits'
Commit = require '../server/models/commit'


describe 'Patch: remove duplicated github commits', ->


    before (done) ->
        map = (doc) ->
            emit doc.date, doc
            return
        Commit.defineRequest 'bydate', map, done


    before (done) ->
        commits = [
                sha: '123'
            ,
                sha: '124'
            ,
                sha: '123'
        ]

        Commit.requestDestroy 'byDate', ->
            async.eachSeries commits, (commit, next) ->
                Commit.create commit, ->
                    next()
            , (err) ->
                    done()


    after (done) ->
        Commit.requestDestroy 'byDate', done


    it 'should remove duplicated commits', (done) ->
        Commit.all (err, commits) ->
            should.not.exist err
            commits.length.should.equal 3

            patch ->
                Commit.all (err, commits) ->
                    should.not.exist err
                    commits.length.should.equal 2

                    commits[0].sha.should.equal '124'
                    commits[1].sha.should.equal '123'

                    done()

