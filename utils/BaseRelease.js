'use strict';
const Base = require('yeoman-generator');
// const chalk = require('chalk');
// const fs = require('fs-extra');
// const knownRepositories = require('../../knownRepositories');
// const {toHTTPRepoUrl, toSSHRepoUrl, simplifyRepoUrl} = require('../../utils/repo');
// const opn = require('opn');
// var rp = require('request-promise');
// const semver = require('semver');
// const {parseRequirements} = require('../../utils/pip');
const logSymbols = require('log-symbols');
const {toBaseName, findBase, findName, toCWD, failed} = require('./release');

class BaseRelease extends Base {


  _logVerbose(logMessage, isVerbose = this.options.verbose) {
    if (isVerbose) {
      if (Array.isArray(logMessage)) {
        this.log(...logMessage)
      } else {
        this.log(logMessage)
      }
    }
  }

  /**
   * Executes cmd or returns error message if it failed
   * @param {string} cmd command we want to run i.e. `git`
   * @param {Array} argline arguments of command i.e. `['clone','-b']`
   * @param {string|undefined} cwd directory to execute command
   * @param {any} returnValue
   */
  _spawnOrAbort(cmd, argline, cwd, returnValue) {
    const r = this._spawn(cmd, argline, cwd);
    returnValue = returnValue || cmd;
    if (failed(r)) {
      this.log(r);
      return this._abort('failed: ' + cmd + ' - status code: ' + r.status);
    }
    return Promise.resolve(returnValue);
  }

  /**
   *executes a command line cmd
   * @param {string} cmd command to execute
   * @param {array} argline cmd arguments
   * @param {string} cwd optional directory
   */
  _spawn(cmd, argline, cwd) {
    const options = cwd === false ? {} : {cwd: cwd || this.cwd, stdio: ['inherit', 'pipe', 'pipe']};
    return this.spawnCommandSync(cmd, Array.isArray(argline) ? argline : argline.split(' '), options);
  }

  /**
   * reject promise with error message
   * @param {string} msg
   */
  _abort(msg) {
    return Promise.reject(logSymbols.error, msg ? msg : 'Step Failed: Aborting');
  }

}

module.exports = BaseRelease;
