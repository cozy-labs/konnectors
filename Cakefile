logger = require('printit')
        date: false
        prefix: 'cake'
fs     = require 'fs'
{exec} = require 'child_process'

option '-f' , '--file [FILE*]' , 'test file to run'
option ''   , '--dir [DIR*]'   , 'directory where to grab test files'
option '-e' , '--env [ENV]'      , 'run with NODE_ENV=ENV. Default is test'

options =  # defaults, will be overwritten by command line options
    file        : no
    dir         : no

# Grab test files of a directory
walk = (dir, excludeElements = []) ->
    fileList = []
    list = fs.readdirSync dir
    if list
        for file in list
            if file and file not in excludeElements
                filename = "#{dir}/#{file}"
                stat = fs.statSync filename
                if stat and stat.isDirectory()
                    fileList2 = walk filename, excludeElements
                    fileList = fileList.concat fileList2
                else if filename.substr(-6) is "coffee"
                    fileList.push filename
    return fileList

taskDetails = '(default: ./tests, use -f or -d to specify files and directory)'
task 'tests', "Run tests #{taskDetails}", (opts) ->
    logger.options.prefix = 'cake:tests'
    files = []
    options = opts

    if options.dir
        dirList   = options.dir
        files = walk(dir, files) for dir in dirList
    if options.file
        files  = files.concat options.file
    unless options.dir or options.file
        files = walk "tests"
    env = if options['env'] then "NODE_ENV=#{options.env}" else "NODE_ENV=test"
    env += " DB_NAME=cozy_test AXON_PORT=9223 "
    env += "USE_JS=true" if options['use-js']? and options['use-js']
    logger.info "Running tests with #{env}..."
    command = "#{env} mocha " + files.join(" ") + " --reporter spec --colors "
    command += "--globals clearImmediate,setImmediate "
    command += "--compilers coffee:coffee-script/register"
    exec command, (err, stdout, stderr) ->
        console.log stdout
        if err
            logger.error "Running mocha caught exception:\n" + err
            process.exit 1
        else
            logger.info "Tests succeeded!"
            process.exit 0

task "lint", "Run coffeelint on source files", ->

    lintFiles = walk '.',  ['node_modules', 'tests']

    # if installed globally, output will be colored
    testCommand = "coffeelint -v"
    exec testCommand, (err, stdout, stderr) ->
        if err or stderr
            command = "./node_modules/coffeelint/bin/coffeelint"
        else
            command = "coffeelint"

        command += " -f coffeelint.json -r " + lintFiles.join " "
        exec command, (err, stdout, stderr) ->
            console.log stderr
            console.log stdout
