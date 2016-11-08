// NPM imports
import printit from 'printit'
import PythonShell from 'python-shell'

const WeboobFetcher = function (logger) {
    let client = null

    if (!logger) {
        logger = printit({
            prefix: 'WeboobFetcher',
            date: true
        })
    }

    /**
     * Start a Cozyweboob conversation.
     *
     * @param   callback    optional callback
     */
    const _connect = function (callback) {
        logger.info('Starting Cozyweboob...')
        const currentPath = path.dirname(fs.realpathSync(__filename))
        // Attach to the python script
        // Store client in data to be able to reuse it afterwards
        client = new PythonShell(
            'stdin_conversation.py',
            {
                pythonPath: 'python2',
                scriptPath: path.join(
                    currentPath,
                    '../../../../server/lib/weboob/cozyweboob/'
                ),
            }
        );

        client.on('error', function (err) {
            logger.error('An error occurred with Cozyweboob:');
            logger.raw(err.stack);
        });

        client.send(
            'GET /ping'
        );

        // Attach to first message event
        client.once('message', function (message) {
            logger.info('Cozyweboob successfully started!')
            if (callback) {
                return callback()
            }
        })
    }


    /**
     * Fetch data from Cozyweboob, according to the given JSON description
     *
     * @param   JSONModulesDescription  A JSON description of modules to fetch
     *                                  (see Cozyweboob docs)
     * @param   callback    optional callback receiving an object of fetched
     *                      data
     */
    const _fetch = function (JSONModulesDescription, callback) {
        logger.info('Fetching data from Cozyweboob...')
        if (!client) {
            logger.error('You should start the client first!')
            return
        }

        client.send(
            `POST /fetch ${JSONModulesDescription}`
        );

        // Attach to first message event
        client.once('message', function (message) {
            logger.info('Done fetching data from cozyweboob!')
            if (callback) {
                return callback(JSON.parse(message))
            }
        })
    }


    /**
     * List available connectors from Cozyweboob
     *
     * @param   callback    optional callback receiving an Object of available
     *                      connectors and their properties
     */
    const _list = function (callback) {
        logger.info('Listing available connectors from Cozyweboob...')
        if (!client) {
            logger.error('You should start the client first!')
            return
        }

        client.send(
            'GET /list'
        );

        // Attach to first message event
        client.once('message', function (message) {
            logger.info('Done fetching available connectors from cozyweboob!')
            if (callback) {
                return callback(JSON.parse(message))
            }
        })
    }


    /**
     * Clean temporary files created by Cozyweboob
     *
     * @param   callback    optional callback receiving a list of cleaned
     *                      folders
     */
    const _clean = function (callback) {
        logger.info('Cleaning temporary files from Cozyweboob...');
        if (!client) {
            logger.error('You should start the client first!')
            return
        }

        // Send the clean command
        client.send('POST /clean');

        // Attach to first message event
        client.once('message', function (message) {
            // Store fetched entries
            logger.info('Done cleaning temporary files from cozyweboob:');
            logger.raw(message);
            if (callback) {
                return callback(JSON.parse(message));
            }
        });
    }


    /**
     * Quit the conversation with Cozyweboob
     *
     * Should always be called when you are done with the client.
     *
     * @param   callback    optional callback
     */
    const _exit = function (callback) {
        logger.info('Closing conversation with cozyweboob...');
        if (!client) {
            logger.error('You should start the client first!')
            return
        }

        // Remove all error listeners at this point, error are treated directly in the end function.
        client.removeAllListeners('error');
        client.end(function (message) {
            if (message && message.exitCode != 0) {
                logger.error('Error while closing the conversation with cozyweboob:');
                logger.raw(err);
            }
            logger.info('Conversation with cozyweboob successfully closed!');
            if (callback) {
                return callback();
            }
        });
    }

    return {
        'connect': _connect,
        'fetch': _fetch,
        'list': _list,
        'clean': _clean,
        'exit': _exit
    }
}

export default WeboobFetcher
