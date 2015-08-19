should = require 'should'
nock = require 'nock'
moment = require 'moment'

connector = require '../server/konnectors/rescuetime'

basepath = '/anapi/data?key=testkey&format=json&perspective=interval&' + \
           'resolution_time=day'

start = moment().subtract(10, 'years').format 'YYYY-MM-DD'
end = moment().add(1, 'days').format 'YYYY-MM-DD'
now = moment().format 'YYYY-MM-DD'


# Mock rescue time server.
mock = nock('https://www.rescuetime.com')
    .get(basepath + "&restrict_begin=#{start}&restrict_end=#{end}")
    .reply(200,
        rows: [
          [ '2013-12-21T00:00:00', 7, 1, 'npmjs.org', 'Marketing', 2 ]
          [ '2013-12-21T00:00:00', 3, 1, 'Firefox', 'Browsers', 0 ],
        ]
    )
    .get(basepath + "&restrict_begin=2013-12-21&restrict_end=#{end}")
    .reply 200,
        rows: [
          [ '2013-12-22T00:00:00', 7, 1, 'npmjs.org', 'Marketing', 2 ]
          [ "#{now}T00:00:00", 7, 1, 'npmjs.org', 'Marketing', 2 ]
        ]
    .get(basepath + "&restrict_begin=#{now}&restrict_end=#{end}")
    .reply 200,
        rows: [
          [ "#{now}T00:00:00", 7, 1, 'npmjs.org', 'Marketing', 2 ]
        ]


describe "When I fetch rescuetime data", ->

    before (done) ->
        connector.init (err) =>
            connector.models.activities.destroyAll (err) =>
                should.not.exist err
                done()

    it "It should store two activities", (done) =>
        connector.fetch apikey: 'testkey', (err) =>
            should.not.exist err

            connector.models.activities.all (err, activities) =>
                should.not.exist err
                activities.length.should.equal 2
                done()

    it "The second time it should store two more activities", (done) =>
        connector.fetch apikey: 'testkey', (err) =>
            should.not.exist err

            connector.models.activities.all (err, activities) =>
                should.not.exist err
                activities.length.should.equal 4
                done()

    it "The third time it should not store any new activities", (done) =>
        connector.fetch apikey: 'testkey', (err) =>
            should.not.exist err

            connector.models.activities.all (err, activities) =>
                should.not.exist err
                activities.length.should.equal 4
                done()

