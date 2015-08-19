should = require 'should'
sinon = require 'sinon'
moment = require 'moment'
Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'
localization = require '../../server/lib/localization_manager'

helpers = require './helpers'

clone = (object) -> JSON.parse JSON.stringify(object)

describe 'ISEN Konnector - .isInNearFuture', ->


    describe "When the date a given monday", ->

        before ->
            @date = '2015-02-09T07:00:00.000Z'

        describe "If the today is a monday", ->
            before ->
                fakeNow = moment('2015-02-02T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a tuesday", ->
            before ->
                fakeNow = moment('2015-02-03T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a wednesday", ->
            before ->
                fakeNow = moment('2015-02-04T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a thursday", ->
            before ->
                fakeNow = moment('2015-02-05T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok


        describe "If the today is a friday", ->
            before ->
                fakeNow = moment('2015-02-06T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

        describe "If the today is a saturday", ->
            before ->
                fakeNow = moment('2015-02-07T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

        describe "If the today is a sunday", ->
            before ->
                fakeNow = moment('2015-02-08T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

    describe "When the date is a tuesday", ->

        before ->
            @date = '2015-02-10T07:00:00.000Z'

        describe "If the today is a monday", ->
            before ->
                fakeNow = moment('2015-02-02T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a tuesday", ->
            before ->
                fakeNow = moment('2015-02-03T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a wednesday", ->
            before ->
                fakeNow = moment('2015-02-04T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return false", ->
                Isen.isInNearFuture(@date).should.not.be.ok

        describe "If the today is a thursday", ->
            before ->
                fakeNow = moment('2015-02-05T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

        describe "If the today is a friday", ->
            before ->
                fakeNow = moment('2015-02-06T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

        describe "If the today is a saturday", ->
            before ->
                fakeNow = moment('2015-02-07T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok

        describe "If the today is a sunday", ->
            before ->
                fakeNow = moment('2015-02-08T00:00:00.000Z').valueOf()
                @clock = sinon.useFakeTimers fakeNow

            after -> @clock.restore()

            it "should return true", ->
                Isen.isInNearFuture(@date).should.be.ok
