'use strict';
const chalk = require('chalk');

let versionHasBeenShown = false;

function resetVersionHasBeenShown() {
  versionHasBeenShown = false;
}

function checkRequiredVersion(versions) {
  if (versionHasBeenShown) {
    return null;
  }

  versionHasBeenShown = true;

  if (!versions.isSatisfied) {
    if (versions.installed.node > versions.required.node || versions.installed.npm > versions.required.npm) {
      return warningMessage(versions);
    }

    throw new Error(errorMessage(versions));
  }

  if (versions.isSatisfied) {
    return successMessage(versions);
  }
}

function successMessage(versions) {
  return `\nYour Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}).` + chalk.green(` Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).\n`);
}

function warningMessage(versions) {
  return '\nWarnings: \n' + chalk.yellow(`Your Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}). Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).\n`);
}

function errorMessage(versions) {
  return chalk.red(`\nYour Node.js version is ${versions.installed.node} (npm: ${versions.installed.npm}). Required Node.js version is ${versions.required.node} (npm: ${versions.required.npm}).`) +
  '\nTo update:\n' +
  chalk.green('1. Install Node.js Version Manager (NVM): ') + chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script') +
  chalk.green(`\n2. Install Node.js ${versions.required.node} via NVM: `) + chalk.yellow(`nvm install ${versions.required.node}\n`);
}

module.exports = {
  checkRequiredVersion: checkRequiredVersion,
  resetVersionHasBeenShown: resetVersionHasBeenShown,
  successMessage: successMessage,
  warningMessage: warningMessage,
  errorMessage: errorMessage
};
