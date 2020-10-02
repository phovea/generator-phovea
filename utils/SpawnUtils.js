'use strict';

const spawnSync = require('child_process').spawnSync;

module.exports = class SpawnUtils {

    /**
     * Execute a shell command - abort if it fails.
     * @param {string} cmd  Command to execute.
     * @param {string | string[]} argline Arguments to execute the command with.
     * @param {string} cwd The directory in Which the command should be excecuted.
     */
    static spawnOrAbort(cmd, argline, cwd, verbose) {
        const result = SpawnUtils.spawnSync(cmd, argline, cwd, verbose);
        const stdout = result.stdout;
        if (SpawnUtils.failed(result)) {
            console.log(result.stderr.toString());
            return SpawnUtils.abort(`Failed: "${cmd} ${Array.isArray(argline) ? argline.join(' ') : argline}" - status code: ${result.status}`);

        } else if (stdout && stdout.toString() && verbose) {
            console.log(stdout.toString().trim());
        }

        return Promise.resolve(cmd);
    }

    /**
     * Execute shell command
     * @param {string} cmd Command to execute.
     * @param {string | string[]} argline Arguments to execute the command with.
     * @param {string} cwd The directory in Which the command should be excecuted.
     */
    static spawnSync(cmd, argline, cwd, verbose) {
        const options = {
            ...cwd ? {cwd} : {},
            ...verbose ? {stdio: 'inherit'} : {}
        };
        console.log(Array.isArray(argline) ? argline : argline.split(' '))
        return spawnSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
    }

    /**
     * Shell command result object
     * @param {{}} spawnResult 
     */
    static failed(spawnResult) {
        return spawnResult.status !== 0;
    }

    /**
     * Reject Promise with error message.
     * @param {string} msg Error message to log.
     */
    static abort(msg) {
        return Promise.reject(msg ? msg : 'Step Failed: Aborting');
    }
};
