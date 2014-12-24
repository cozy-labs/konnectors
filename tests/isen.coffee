should = require 'should'
Isen = require '../server/konnectors/isen'

describe 'Testing ISEN konnector', ->

    describe 'When I launch an import with the isen connector', ->
        it 'It should fail with empty logins', ->
            requiredFields =
                firstname: ""
                lastname: ""
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err

        it 'It should fail with wrong logins', ->
            requiredFields =
                firstname: "richard"
                lastname: "stallman"
            Isen.fetchIcs requiredFields, (err) ->
                should.exist err

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
            "agne.fr/cc/jsonFileList/A3.CIR.TRAITEMENT_SIGNAL\\n\nCLASS:PUBL" +
            "IC\n"
            Isen.parseIcs data, (err) ->
                should.not.exist err
