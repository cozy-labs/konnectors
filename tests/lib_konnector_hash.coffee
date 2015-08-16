fs = require 'fs'
path = require 'path'

should = require 'should'
konnectorHash = require '../server/lib/konnector_hash'


describe 'Konnector Hash', ->

    konnectorPath = path.join __dirname, '..', 'server', 'konnectors'
    moduleFiles = fs.readdirSync konnectorPath

    it 'gives the konnector modules', ->
        Object.keys(konnectorHash).length.should.equal moduleFiles.length

        for filename in moduleFiles
            key = filename.substring 0, filename.length - '.coffee'.length
            should.exist konnectorHash[key]

