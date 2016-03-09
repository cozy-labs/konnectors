fs = require 'fs'
path = require 'path'

should = require 'should'
konnectorHash = require '../server/lib/konnector_hash'


describe 'Konnector Hash', ->

    konnectorPath = path.join __dirname, '..', 'server', 'konnectors'
    moduleFiles = fs.readdirSync konnectorPath

    it 'gives the konnector modules', ->
        expectedLength = moduleFiles.length
        expectedLength++ if konnectorHash.test?
        Object.keys(konnectorHash).length.should.equal expectedLength

        for filename in moduleFiles
            if filename.indexOf('coffee') > 0
                key = filename.substring 0, filename.length - '.coffee'.length
            else
                key = filename.substring 0, filename.length - '.js'.length
            should.exist konnectorHash[key]

