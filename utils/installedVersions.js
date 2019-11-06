'use strict';
const chalk = require('chalk');
const semver = require('semver');
let versionHasBeenShown = false;// using closure so that the checkRequiredVersion() function only gets executed once when called multiple times

/**
 * resets the remembered variable
 * in order to test checkRequiredVersion()
 */
function resetVersionHasBeenShown() {
  versionHasBeenShown = false;
}

/**
 * @param {object} versions contains the installed and required node and npm versions
 * @returns `successMessage || errorMessage || warningMessage ||` depending on required/installed node and npm version
 */
function checkRequiredVersion(versions) {
  if (versionHasBeenShown) {
    return null;// don't run function if it is already been executed once
  }
  versionHasBeenShown = true;
  if (semver.satisfies(semver.coerce(versions.installed.node), versions.required.node) && semver.satisfies(semver.coerce(versions.installed.npm), versions.required.npm)) {
    return successMessage(versions);
  } else if (semver.satisfies(semver.coerce(versions.installed.node), '<' + versions.required.node) || semver.satisfies(semver.coerce(versions.installed.npm), '<' + versions.required.npm)) {
    throw new Error(errorMessage(versions));
  }

  return warningMessage(versions);
}

/**
 * @param {object} versions contains the installed and required node and npm versions
 * @returns {string}
 */
function successMessage(versions) {
  return `\nYour Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}).` + chalk.green(` Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`);
}

/**
 * @param {object} versions contains the installed and required node and npm versions
 * @returns {string}
 */
function warningMessage(versions) {
  return `\nWarnings: \n\n${chalk.yellow(`Your Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}). Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`)}`;
}

/**
 * @param {object} versions contains the installed and required node and npm versions
 * @returns {string}
 */
function errorMessage(versions) {
  return chalk.red(`\nYour Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}). Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`) +
    '\n\nTo update:\n\n' +
    chalk.green('1. Install Node.js Version Manager (NVM): ') + chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script') +
    chalk.green(`\n2. Install Node.js ${versions.required.node} via NVM: `) + chalk.yellow(`nvm install ${versions.required.node}`);
}

module.exports = {
  checkRequiredVersion: checkRequiredVersion,
  resetVersionHasBeenShown: resetVersionHasBeenShown,
  successMessage: successMessage,
  warningMessage: warningMessage,
  errorMessage: errorMessage
};
