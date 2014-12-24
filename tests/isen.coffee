should = require 'should'
Isen = require '../server/konnectors/isen'

describe 'Testing ISEN konnector', ->

    describe 'When I try to authentificate myself', ->
        it 'It should fail with empty logins', ->
            requiredFields =
                firstname: ""
                lastname: ""
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err

        it 'It should fail with wrong logins', (done)->
            requiredFields =
                firstname: "richard"
                lastname: "stallman"
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err
                done()

        # it 'It should work with correct logins', (done)->
        #     @timeout 10000
        #     requiredFields =
        #         firstname: "test"
        #         lastname: "test"
        #     Isen.fetchIcs requiredFields, (err) ->
        #         should.not.exist err
        #         done()


    describe 'When parsing file retrieved', ->
        it 'It should fail if no matching url was found', ->
            data = "http://web.isen-bretagne.fr/fakeurl\n" +
            "Lorem ipsum dolor sit amet.\n\n"
            Isen.parseIcs data, (err) ->
                should.exist err

        it 'It should work if matching urls were found', ->
            data = "CATEGORIES:Aurion/ISEN-Bretagne\nDESCRIPTION:Activité - " +
            "TD\\nMatière - Traitement du signal\\nCours - Traitement Signal" +
            "\\nIntervenant(s) - Linus TORVALDS\\nLieu - S42\\nURL(S) DU" +
            " COURS - A3.CIR.TRAITEMENT_SIGNAL\\n[Traitement du signal] http" +
            "s://web.isen-bretagne.fr/moodle/course/view.php?id=666\\nFICHIER" +
            "(S) DU COURS - A3.CIR.TRAITEMENT_SIGNAL\\nhttps://web.isen-bret" +
            "agne.fr/cc/jsonFileList/A3.CIR.TEST\\n\nCLASS:PUBL" +
            "IC\n"
            Isen.parseIcs data, (err) ->
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
            # To change
            url = 'https://web.isen-bretagne.fr/cc/jsonFileList/A3.CIR.MICROCONTROLEUR'
            Isen.fetchJson url, (err) ->
                should.not.exist err
                done()

    # describe 'When I launch an import with the isen connector', ->
    #     it 'It should work with correct logins', (done)->
    #         @timeout 240000
    #         requiredFields =
    #             firstname: "test"
    #             lastname: "test"
    #         Isen.fetch requiredFields, (err) ->
    #             should.not.exist err
    #             done()
