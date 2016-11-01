'use strict';
/**
 * A Konnector to communicate with a Weboob instance.
 *
 * You need a running [cozyweboob](https://github.com/Phyks/cozyweboob)
 * somewhere.
 */

// NPM imports
import fs from 'fs';
import path from 'path';
import PythonShell from 'python-shell';
import requestJson from 'request-json';

// Konnectors imports
import baseKonnector from '../../lib/base_konnector';
import filterExisting from '../../lib/filter_existing';
import saveDataAndFile from '../../lib/save_data_and_file';

// Models imports
// TODO: Add support for others models
import Bill from '../../models/bill';

// Local imports
import Converters from './converters';


/**
 * Konnector definition.
 */
const weboobKonnector = baseKonnector.createNew({
    name: 'Weboob',
    vendorLink: 'https://github.com/Phyks/cozyweboob',
    fields: {
        JSONModulesDescription: 'text',
        folderPath: 'folder',
    },
    models: [
        Bill
    ],
    fetchOperations: [
        fetchData,
        parseData,
        customFilterExisting,
        customSaveDataAndFile,
        cleanCozyWeboob,
        closeConversation,
        buildNotificationContent,
    ],
});


/**
 * fetchData
 *
 * Fetch all the required data from the Weboob instance.
 */
function fetchData(requiredFields, entries, data, next) {
    weboobKonnector.logger.info('Starting to fetch data from cozyweboob...');
    const currentPath = path.dirname(fs.realpathSync(__filename))
    // Attach to the python script
    // Store client in data to be able to reuse it afterwards
    data.client = new PythonShell(
        'stdin_conversation.py',
        {
            pythonPath: 'python2',
            scriptPath: path.join(
                currentPath,
                '../../../../server/konnectors/weboob/cozyweboob/'
            ),
        }
    );

    // Attach to error event
    data.client.on('error', function (err) {
        weboobKonnector.logger.error('An error occurred while fetching data.');
        weboobKonnector.logger.raw(err.stack);
    });

    // Send the fetch command
    data.client.send(
        `POST /fetch ${requiredFields.JSONModulesDescription}`
    );

    // Attach to first message event
    data.client.once('message', function (message) {
        // Store fetched entries
        data.rawEntries = JSON.parse(message);
        weboobKonnector.logger.info('Done fetching data from cozyweboob!');
        next();
    });
}


/**
 * parseData
 *
 * Parse all the data we got back from the API, converting it to Cozy models.
 */
function parseData(requiredFields, entries, data, next) {
    weboobKonnector.logger.info('Starting to convert data from weboob types to cozy models...');
    data.parsedEntries = {};
    Object.keys(data.rawEntries).forEach(function (moduleName) {
        let moduleData = data.rawEntries[moduleName];
        Object.keys(moduleData).forEach(function (weboobType) {
            if (Converters[weboobType] === undefined) {
                return;
            }
            let fieldData = moduleData[weboobType];
            let downloaded_documents = moduleData.downloaded;
            // Convert all the available entries and store them in parsed
            // entries
            let { cozyModel, parsedData } = Converters[weboobType](fieldData, moduleName, downloaded_documents);
            if (cozyModel !== undefined && parsedData !== undefined) {
                data.parsedEntries[cozyModel] = [].concat(
                    data.parsedEntries[cozyModel] || [],
                    parsedData
                );
            }
        });
    });
    weboobKonnector.logger.info('Done converting data from weboob types to cozy models!');
    next();
}


/**
 * customFilterExisting
 *
 * Custom wrapper around filterExisting layer, to use the connector own logger.
 */
function customFilterExisting(requiredFields, entries, data, next) {
    weboobKonnector.logger.info('Start filtering existing data...');
    entries.fetched = data.parsedEntries[Bill];
    filterExisting(weboobKonnector.logger, Bill) (
        requiredFields,
        entries,
        data,
        function () {
            weboobKonnector.logger.info('Done filtering existing data!');
            next();
        }
    );
}


/**
 * customSaveDataAndFile
 *
 * Custom wrapper around saveDataAndFile layer, to use the connector own logger.
 */
function customSaveDataAndFile(requiredFields, entries, data, next) {
    const fileOptions = {
        vendor: 'weboob',  // TODO
        dateFormat: 'YYYYMMDD',
    };
    weboobKonnector.logger.info('Saving data...');
    saveDataAndFile(
        weboobKonnector.logger,
        Bill,
        fileOptions,
        ['bill']  // TODO
    ) (
        requiredFields,
        entries,
        data,
        function () {
            weboobKonnector.logger.info('All data imported successfully!');
            next();
        }
    );
}


/**
 * cleanCozyWeboob
 *
 * Clean temporary files downloaded by CozyWeboob.
 */
function cleanCozyWeboob(requiredFields, entries, data, next) {
    weboobKonnector.logger.info('Start cleaning temporary files from cozyweboob...');

    // Send the clean command
    data.client.send('POST /clean');

    // Attach to first message event
    data.client.once('message', function (message) {
        // Store fetched entries
        weboobKonnector.logger.info('Done cleaning temporary files from cozyweboob:');
        weboobKonnector.logger.raw(message);
        next();
    });
}


/**
 * closeConversation
 *
 * Close the conversation channel with the cozyweboob Python script.
 */
function closeConversation(requiredFields, entries, data, next) {
    weboobKonnector.logger.info('Start closing conversation with cozyweboob...');
    // Remove all error listeners at this point, error are treated directly in the end function.
    data.client.removeAllListeners('error');
    data.client.end(function (message) {
        if (message.exitCode != 0) {
            weboobKonnector.logger.error('Error while closing the conversation with cozyweboob:');
            weboobKonnector.logger.raw(err);
        }
        weboobKonnector.logger.info('Done closing conversation with cozyweboob!');
        next();
    });
}


/**
 * buildNotificationContent
 *
 * Build the notification content.
 */
function buildNotificationContent(requiredFields, entries, data, next) {
    // TODO
    next();
}


export default weboobKonnector;
