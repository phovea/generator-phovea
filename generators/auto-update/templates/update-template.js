'use strict';

const fse = require('fs-extra');



/**
 * Outputs text to the console.
 * @typedef {function(string): void} Log
 */

/**
 * Update implementation.
 * @param {string} repo Name of the current repo.
 * @param {string} pluginType Type of plugin i.e., `lib-slib`.
 * @param {string} cwd The path to the current cloned repo files.
 * @param {Log} log Logging function, `console.log` will not work.
 *  @example log('Message').
 * @returns {Promise<any>}
 */
async function update(repo, pluginType, cwd, log) {
    // use asynchronous functions to write to the filesystem
    // i.e., `await fse.promises.writeFile(path)` instead of fse.writeJSONSync
}


module.exports = {
    update,
    /** Description of what the update does. Will be used in PR body.*/
    description: 'Add description'
};