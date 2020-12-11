'use strict';

const fse = require('fs-extra');
const { merge } = require('lodash');
const path = require('path');
const { lib, plugin } = require('../../../utils/types');



/**
 * Outputs text to the console.
 * @typedef {function(string): void} Log
 */

/**
 * Update 6.0.0 implementation.
 * @param {string} repo Name of the current repo.
 * @param {string} pluginType Type of plugin i.e., `lib-slib`.
 * @param {string} cwd The path to the current cloned repo files.
 * @param {Log} log Logging function, `console.log` will not work.
 * @returns {Promise<any>}
 */
async function update(repo, pluginType, cwd, log) {
    const type = { type: pluginType };
    const updateCondition = lib.isTypeHybrid(type) || lib.isTypeWeb(type) || plugin.isTypeHybrid(type) || plugin.isTypeWeb(type);
    if (!updateCondition) {
        return;
    }
    const gitignore = (await fse.promises.readFile(path.join(cwd, '.gitignore'))).toString();
    const newGitignore = gitignore.replace('/build/', '/build/\n/dist/tsBuildInfoFile');

    await fse.promises.writeFile(path.join(cwd, '.gitignore'), newGitignore);
    const tsConfig = await fse.readJson(path.join(cwd, 'tsconfig.json'));
    merge(tsConfig, {
        compilerOptions: {
            incremental: true,
            tsBuildInfoFile: 'dist/tsBuildInfoFile'
        }
    });
    await fse.writeJSON(path.join(cwd, 'tsconfig.json'), tsConfig, { spaces: 2 });
}


module.exports = {
    update,
    /** Description of what the update does. Will be used in PR body. */
    description: 'Add `--incremental` build flag for ts compiler '
};