fs = require 'fs'
should = require 'should'
Isen = require '../../server/konnectors/isen'

helpers = require './helpers'

describe 'ISEN Konnector - .parseIcs', ->

    describe "When ICS is valid", ->

        it "should be successful", (done) ->
            validIcs = helpers.getStudentIcs()
            Isen.parseIcs validIcs, (err, events, boundaries) ->
                should.not.exist err
                should.exist events
                should.exist boundaries
                events.length.should.equal 101
                boundaries.should.have.property 'start', '2015-07-07T12:30:00.000Z'
                boundaries.should.have.property 'end', '2015-09-30T10:00:00.000Z'
                done()

    describe "When ICS is invalid", ->

        it "should return an error", (done) ->
            invalidIcs = """
            BEGIN:VCALENDAR
            X-WR-CALNAME;VALUE=TEXT:Aurion/ISEN-Bretagne/1420441200000/1435294800000/Rémi.COLLIGNON
            PRODID:-//ISEN-Brest-ics-v1.0.0
            VERSION:2.0
            BEGIN:VEVENT
            UID:Aurion-1517686
            LAST-MODIFIED:20141211T164221Z
            SUMMARY:Electronique Analogique
            LOCATION:S237
            CATEGORIES:Aurion/ISEN-Bretagne
            DESCRIPTION:Activité - COURS\nMatière - Electronique\nCours - Electronique Analogique\nIntervenant(s) - El-Houssin EL BOUCHIKHI\nLieu - S237\n
            CLASS:PUBLIC
            STATUS:CONFIRMED
            ATTENDEE;ROLE=CHAIR;PARTSTAT=ACCEPTED;CN="Rémi COLLIGNON":MAILTO:remi.collignon@isen-bretagne.fr
            DTSTAMP:20150114T123006Z
            DTEND:20150105T111500Z
            END:VEVENT
            """
            Isen.parseIcs invalidIcs, (err, events, boundaries) ->
                should.exist err
                should.not.exist events
                should.not.exist boundaries
                done()
