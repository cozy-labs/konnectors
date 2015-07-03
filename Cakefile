logger = require('printit')
        date: false
        prefix: 'cake'
fs     = require 'fs'
{exec, spawn} = require 'child_process'

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
    logger.info "Running tests with #{env}..."
    command = "#{env} mocha " + files.join(" ") + " --reporter spec --colors "
    command += "--globals clearImmediate,setImmediate "
    command += "--compilers coffee:coffee-script/register"
    exec command, (err, stdout, stderr) ->
        console.log stdout
        if err
            console.log stderr if process.env.TRAVIS
            logger.error "Running mocha caught exception:\n" + err
            process.exit 1
        else
            logger.info "Tests succeeded!"
            process.exit 0

task "lint", "Run coffeelint on source files", ->

    lintFiles = walk '.',  ['node_modules', 'tests', 'locales']

    command = "./node_modules/coffeelint/bin/coffeelint"
    args = ["-f", "coffeelint.json", "-r", "--color=always"]

    coffeelint = spawn command, args.concat lintFiles
    coffeelint.stdout.pipe process.stdout
    coffeelint.stderr.pipe process.stderr

buildJade = ->
    jade = require 'jade'
    filename = "./client/index.jade"
    template = fs.readFileSync filename, 'utf8'
    output = "var jade = require('jade/runtime');\n"
    output += "module.exports = " + jade.compileClient template, {filename}
    fs.writeFileSync "./build/client/index.js", output

task 'build', 'Build CoffeeScript to Javascript', ->
    logger.options.prefix = 'cake:build'
    logger.info "Start compilation..."
    command = "coffee -cb --output build/server server && " + \
              "coffee -cb --output build/ server.coffee && " + \
              "rm -rf build/client && mkdir build/client &&  mkdir build/client/app && " + \
              "coffee -cb --output build/client/app/locales/ client/app/locales && " + \
              "cd client/ && brunch build --production && cd .. && " + \
              "cp -R client/public build/client/"

    exec command, (err, stdout, stderr) ->
        if err
            logger.error "An error has occurred while compiling:\n" + err
            process.exit 1
        else
            buildJade()
            logger.info "Compilation succeeded."
            process.exit 0
