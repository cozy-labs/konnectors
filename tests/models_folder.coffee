should = require 'should'
assert = require('chai').assert
Folder = require '../server/models/folder'
sinon = require 'sinon'


describe 'Folder model', ->

    it 'get full path returns the full path in Cozy Files', ->

        folder = new Folder
            name: 'test'
            path: '/folder/subfolder'

        should.exist folder.getFullPath()
        folder.getFullPath().should.equal '/folder/subfolder/test'

    describe 'mkdir', ->

        beforeEach () ->
            sinon.stub Folder, 'createNewFolder'
            sinon.stub Folder, 'isPresent'

        afterEach () ->
            Folder.createNewFolder.restore()
            Folder.isPresent.restore()

        it 'calls createNewFolder when folder is not present', (done) ->
            # Arrange
            isPresent = false
            Folder.isPresent.callsArgWith(1, null, isPresent)

            folder = new Folder
                name: 'test'
                path: '/folder'

            callback = sinon.spy()

            folderMatch = sinon.match folder

            # Act
            Folder.mkdir folder, callback

            # Assert
            setTimeout ->
                assert Folder.createNewFolder \
                    .withArgs(folderMatch, callback).calledOnce

                done()
            , 10

        it 'doesn\'t call createNewFolder when folder is present', (done) ->
            # Arrange
            isPresent = true
            Folder.isPresent.callsArgWith(1, null, isPresent)

            folder = new Folder
                name: 'test'
                path: '/folder'

            callback = sinon.spy()

            folderMatch = sinon.match folder

            # Act
            Folder.mkdir folder, callback

            # Assert
            setTimeout ->
                assert.isFalse Folder.createNewFolder.called
                assert callback.withArgs(null, folderMatch).calledOnce

                done()
            , 10

        it 'returns error if name is empty', (done) ->
            # Arrange
            path = '/folder'

            folder = new Folder
                name: ''
                path: path

            callback = sinon.spy()

            pathMatch = sinon.match
                path: path

            # Act
            Folder.mkdir folder, callback

            # Assert
            setTimeout ->
                assert callback.withArgs(null, pathMatch).calledOnce
                assert.isFalse Folder.createNewFolder.called
                assert.isFalse Folder.isPresent.called
                done()
            , 10

    describe 'mkdirp', ->

        beforeEach ->
            sinon.stub Folder, 'mkdir'

        afterEach ->
            Folder.mkdir.restore()

        it 'calls mkdir one time', (done) ->
            # Arrange
            Folder.mkdir.callsArgWith(1, null)

            path = 'testmkdirp'

            callback = sinon.spy()

            expectedFolderMatch = sinon.match
                name: 'testmkdirp'
                path: ''

            # Act
            Folder.mkdirp path, callback

            # Assert
            setTimeout ->
                assert Folder.mkdir.withArgs(expectedFolderMatch).calledOnce
                assert callback.calledOnce
                done()
            , 10

        it 'calls mkdir a multiple times', (done) ->
            # Arrange
            Folder.mkdir.callsArgWith(1, null)

            path = '/long/path/test'

            callback = sinon.spy()

            expectedFolderMatches = [
                sinon.match
                    name: 'long'
                    path: '',
                sinon.match
                    name: 'path'
                    path: '/long',
                sinon.match
                    name: 'test'
                    path: '/long/path'
            ]

            # Act
            Folder.mkdirp path, callback

            # Assert
            setTimeout ->
                assert Folder.mkdir.callCount is expectedFolderMatches.length

                expectedFolderMatches.forEach (expectedFolderMatch) ->
                    assert Folder.mkdir.withArgs(expectedFolderMatch).calledOnce

                assert callback.calledOnce

                done()
            , 10

        it 'calls callback with error when path is empty', ->
            # Arrange
            path = ''
            callback = sinon.spy()

            errorMatch = sinon.match new Error 'empty path'

            # Act
            Folder.mkdirp path, callback

            # Assert
            assert callback.withArgs(errorMatch).calledOnce

        it 'calls callback with error when path is root', ->
            # Arrange
            path = '/'
            callback = sinon.spy()

            errorMatch = sinon.match new Error 'empty path'

            # Act
            Folder.mkdirp path, callback

            # Assert
            assert callback.withArgs(errorMatch).calledOnce
