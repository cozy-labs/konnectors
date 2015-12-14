should = require 'should'


GCH = require '../server/lib/google_contact_helper'
ContactHelper = require '../server/lib/contact_helper'


contactFull = require './fixtures/cozy_contact_full.json'
googleFull = require './fixtures/google_contact_full.json'

describe 'contact helper', ->
    describe 'extract Id', ->
        it 'works', ->
            GCH.extractGoogleId googleFull.entry
            .should.equal "58b0cfc38bf730e5"

    describe 'parse Google Contact', ->

        parsed = GCH.fromGoogleContact googleFull.entry
        it 'works', ->
            ContactHelper.intrinsicRev parsed
            .should.equal ContactHelper.intrinsicRev contactFull

        it 'parse name', ->
            parsed.n.should.equal "von AAALast;AAAgoogleFirst;Middleone Middletwo;Mr;Jr"
        it 'parse fullName', ->
            parsed.fn.should.equal "Mr AAAgoogleFirst Middleone Middletwo von AAALast Jr"
        it 'parse org', ->
            parsed.org.should.equal "SuperCorp"
        it 'parse title in organisation', ->
            parsed.title.should.equal "Chairman"
        it 'bday', ->
            parsed.bday.should.equal '1961-04-05'
        it 'note', ->
            parsed.note.should.equal 'Blah, blah\n\nblah blah blah.\n\nblahblah\nCustom: Custom field data'

    describe 'serialize to Google contact', ->

        serialized = GCH.toGoogleContact contactFull, {}

        it 'serialize name', ->
            serialized.gd$name.should.eql
                "gd$givenName": "$t": "AAAgoogleFirst"
                "gd$fullName": {
                    "$t": "Mr AAAgoogleFirst Middleone Middletwo von AAALast Jr"
                },
                "gd$familyName": "$t": "von AAALast"
                "gd$additionalName": "$t": "Middleone Middletwo"
                "gd$namePrefix": "$t": "Mr"
                "gd$nameSuffix": "$t": "Jr"
        it 'serialize bday', ->
            serialized.gContact$birthday.should.eql "when": "1961-04-05"
        it 'serialize note', ->
            serialized.content.should.eql "$t": "Blah, blah\n\nblah blah blah.\n\nblahblah\nCustom: Custom field data"

