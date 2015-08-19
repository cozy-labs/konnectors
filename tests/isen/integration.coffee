fs = require 'fs'
should = require 'should'
fixtures = require 'cozy-fixtures'
fixtures.setDefaultValues silent: true


Isen = require '../../server/konnectors/isen'
Event = require '../../server/models/event'

loadStudentICS = -> fs.readFileSync '../fixtures/student.ics'

###

Those tests are disabled until a fake API is built in order to not
depends ISEN's servers.

describe 'ISEN Konnector - Integration test', ->

    describe 'When I try to authentificate myself', ->
        it 'It should fail with empty logins', ->
            requiredFields = email: ''
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err

        it 'It should fail with wrong logins', (done) ->
            @timeout 10000
            requiredFields = email: 'richard.stallman@something.fr'
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err
                done()

        it 'It should work with correct logins', (done) ->
            @timeout 10000
            requiredFields = email: 'remi.collignon@isen-bretagne.fr'
            Isen.fetchIcs requiredFields, (err) ->
                should.not.exist err
                done()


    describe 'When parsing file retrieved', ->
        it 'It should fail if no matching url was found', ->
            event =
                details: """http://web.isen-bretagne.fr/fakeurl\n
                Lorem ipsum dolor sit amet.\n\n"""
            Isen.extractUrls [event], (err) ->
                should.not.exist err

        it 'It should work if matching urls were found', ->
            event =
                details: """Activité - TP\nMatière - Gestion de projet\n
                Cours - Gestion de Projet\nIntervenant(s) - Fabienne PROVOST\n
                Lieu - S303\nURL(S) DU COURS - A3.CIR.GESTION_PROJET\n
                [Gestion de projet] https://web.isen-bretagne.fr/moodle/course/view.php?id=217\n
                FICHIER(S) DU COURS - A3.CIR.GESTION_PROJET\nhttps://web.isen-bretagne.fr/cc/jsonFileList/A3.CIR.GESTION_PROJET\n
                """
            Isen.extractUrls [event], (err) ->
                should.not.exist err

    describe 'When fetching json file', ->
        it 'It should fail if the server is down', (done) ->
            @timeout 10000
            url = 'https://192.168.254.254'
            Isen.fetchJson url, (err) ->
                should.exist err
                done()

        it 'It should fail if the file is not a Json', (done) ->
            @timeout 10000
            url = 'https://cozy.io'
            Isen.fetchJson url, (err) ->
                should.exist err
                done()

        it 'It should work if its a valid Json file', (done) ->
            @timeout 10000
            url = 'https://web.isen-bretagne.fr/cc/jsonFileList/A3.CIR.MICROCONTROLEUR'
            Isen.fetchJson url, (err) ->
                should.not.exist err
                done()

    describe 'When I launch an import with the isen connector', ->
        it 'It should work with correct logins', (done) ->
            @timeout 240000
            requiredFields = email: 'remi.collignon@isen-bretagne.fr'
            Isen.fetch requiredFields, (err) ->
                should.not.exist err
                done()

    describe "When there are already events in my calendar", ->

        before (done) ->
            @timeout 10000
            fixtures.load
                doctypeTarget: 'Event'
                callback: done

        after (done) -> fixtures.removeDocumentsOf 'Event', done

        it "it should work with correct logins", (done) ->
            @timeout 240000
            requiredFields = email: 'remi.collignon@isen-bretagne.fr'
            Isen.fetch requiredFields, (err) ->
                should.not.exist err
                done()

        it "and events of other calendars should not have been deleted", (done) ->
            Event.find "myidtofind", (err, event) ->
                should.not.exist err
                should.exist event
                done()

        it "and events not created by the konnectorshould not have been deleted", (done) ->
            Event.find "myidisentofind", (err, event) ->
                should.not.exist err
                should.exist event
                done()
###
