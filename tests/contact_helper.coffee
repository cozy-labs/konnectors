should = require 'should'


CH = require '../server/lib/contact_helper'

contactFull = require './fixtures/cozy_contact_full.json'

describe 'contact helper', ->


    describe 'nToFN', ->

        it 'should always return a string', ->
            name = ['Lastname', 'Firstname', 'MiddleName', 'Prefix', 'Suffix']
            [undefined, null, [], name].forEach (string) ->
                CH.nToFN(string).should.be.String

        it 'should join in a defined order', ->
            nameTable = [
                'Lastname', 'Firstname', 'MiddleName', 'Prefix', 'Suffix'
            ]
            expectedName = 'Prefix Firstname MiddleName Lastname Suffix'
            CH.nToFN(nameTable).should.equal expectedName


    describe 'fnToN', ->

        it 'should always return a Array[5]', ->
            values = [undefined, null, '', 'full name']
            values.forEach (string) ->
                name = CH.fnToN string
                name.should.be.Array
                name.should.have.length 5

        it 'should put value as firstname', ->
            CH.fnToN('full name').should.eql [
                '', 'full name', '', '', ''
            ]


    describe 'adrArrayToString', ->

        it 'should always return a string', ->
            [
                undefined, null, [],
                ["", "", "4, rue Léon Jouhaux", "Paris", "", "75010", "France"]
            ].forEach (string) ->
                CH.adrArrayToString(string).should.be.String

        it 'should serialise on two lines', ->
            values = [
                "", "",
                "4, rue Léon Jouhaux", "Paris", "", "75010", "France"]
            CH.adrArrayToString(values)
                    .should.equal '4, rue Léon Jouhaux\nParis, 75010, France'


    describe 'adrStringToArray', ->

         it 'should always return a Array[7]', ->
            [
                undefined, null, '', '12, rue René Boulanger\n75010 Paris'
            ].forEach (string) ->
                name = CH.adrStringToArray string
                name.should.be.Array
                name.should.have.length 7

        it 'should put string in street address field', ->
            address = '12, rue René Boulanger\n75010 Paris'
            CH.adrStringToArray(address).should.eql [
                '', '',
                '12, rue René Boulanger\n75010 Paris',
                '', '', '', ''
            ]


    describe 'intrinsicRev', ->

        it 'is determinist', ->
            CH.intrinsicRev(contactFull).should.equal CH.intrinsicRev contactFull

        it 'is discriminat', ->
            another = JSON.parse JSON.stringify contactFull
            another.org = 'test'
            CH.intrinsicRev(contactFull).should.not.equal CH.intrinsicRev another


