should = require 'should'
Folder = require '../server/models/folder'


describe 'Folder model', ->

    it 'get full path returns the full path in Cozy Files', ->

        folder = new Folder
            name: 'test'
            path: '/folder/subfolder'

        should.exist folder.getFullPath()
        folder.getFullPath().should.equal '/folder/subfolder/test'

