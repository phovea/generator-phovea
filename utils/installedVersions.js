'use strict';
const chalk = require('chalk');
const semver = require('semver');
let versionHasBeenShown = false;

function resetVersionHasBeenShown() {
  versionHasBeenShown = false;
}

function checkRequiredVersion(versions) {
  if (versionHasBeenShown) {
    return null;
  }
  versionHasBeenShown = true;
  if (semver.satisfies(semver.coerce(versions.installed.node), versions.required.node) && semver.satisfies(semver.coerce(versions.installed.npm), versions.required.npm)) {
    return successMessage(versions);
  } else if (semver.satisfies(semver.coerce(versions.installed.node), '<' + versions.required.node) || semver.satisfies(semver.coerce(versions.installed.npm), '<' + versions.required.npm)) {
    throw new Error(errorMessage(versions));
  }

  return warningMessage(versions);
}

function successMessage(versions) {
  return `\nYour Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}).` + chalk.green(` Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`);
}

function warningMessage(versions) {
  return `\nWarnings: \n\n${chalk.yellow(`Your Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}). Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`)}`;
}

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
