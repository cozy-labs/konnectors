path = require 'path'
fs = require 'fs'

module.exports =

    getStudentIcs: ->
        filePath = path.resolve __dirname, '../fixtures/student.ics'
        return fs.readFileSync filePath


    getRawEvent: ->
        start: '2015-06-26T07:00:00.000Z'
        end: '2015-06-26T10:00:00.000Z'
        place: 'S305'
        details: 'Activité - TP\nMatière - Informatique\nCours - Java Design Patterns\nIntervenant(s) - Thibault NAPOLEON\nLieu - S305\nURL(S) DU COURS - A3.CIR.DESIGN_PATTERNS\n[Design Patterns] https://web.isen-bretagne.fr/moodle/course/view.php?id=231\nFICHIER(S) DU COURS - A3.CIR.DESIGN_PATTERNS\nhttps://web.isen-bretagne.fr/cc/jsonFileList/A3.CIR.DESIGN_PATTERNS\n'
        description: 'Java Design Patterns'
        rrule: ''
        tags: ['ISEN']
        attendees: [{
            id: 1
            email: 'MAILTO:remi.collignon@isen-bretagne.fr'
            contactid: null
            status: 'ACCEPTED'
        }]
        related: null
        timezone: undefined
        alarms: []
        created: undefined
        lastModification: '2014-10-15T12:09:42.000Z'
        id: 'Aurion-1514469'


    getCourseDataFixture: ->
        filePath = path.resolve __dirname, '../fixtures/courseData.json'
        return require filePath
