'use strict';

const spawnSync = require('child_process').spawnSync;
const spawnPr = require('child-process-promise').spawn;

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
            ...cwd ? { cwd } : {},
            ...verbose ? {
                stdio: 'inherit',
            } : {}
        };

        if (verbose) {
            console.log(Array.isArray(argline) ? argline.join(' ') : argline);
        }

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

    /**
     * Execute a shell command and return the decoded output
     * @param command Command to execute
     * @param argline Arguments to execute the command with
     */
    static spawnWithOutput(command, argline, cwd) {
        const options = {
            ...cwd ? { cwd } : {},
            encoding: 'UTF-8'
        };
        return spawnSync(command, Array.isArray(argline) ? argline : argline.split(' '), options).stdout.trim();
    }

    static async spawnPromise(command, argline, cwd,) {
        const options = {
            ...cwd ? { cwd } : {},
            encoding: 'UTF-8',
            capture: ['stdout', 'stderr']
        };
        return spawnPr(command, Array.isArray(argline) ? argline : argline.split(' '), options)
            .catch(e => {
                throw new Error(`${e.message}${'\n' + e.stdout || ''}`);
            });
    }
};
