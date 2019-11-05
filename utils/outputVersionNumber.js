'use strict';
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const nodeVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.nvmrc'), 'utf8'));
const npmVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../npm-version'), 'utf8'));
function rememberedVersionNumber() {
  let versionHasBeenShown = false;
  return (error, results, resolve, instance) => {
    if (error) {
      console.error(error);
      return;
    }
    const currentNodeVersion = parseFloat(results.versions.node.version.version);
    const currentNpmVersion = parseFloat(results.versions.npm.version.version);
    if (!versionHasBeenShown) {
      versionHasBeenShown = true;
      if (!results.isSatisfied) {
        if (currentNodeVersion > nodeVersion && currentNpmVersion > npmVersion) {
          resolve('\nWarnings: \n' + chalk.yellow(`Your Node version is ${currentNodeVersion} (NMP: ${currentNpmVersion}). Required Node version is ${nodeVersion} (NPM: ${npmVersion}).\n`));
          return;
        }
        instance.log(chalk.red(`\nYour Node version is ${currentNodeVersion} (NMP: ${currentNpmVersion}). Required Node version is ${nodeVersion} (NPM: ${npmVersion}).`));
        instance.log('\nTo update:\n');
        instance.log(chalk.green('1. Install Node Version Manager (NVM):'), chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script'));
        instance.log(chalk.green(`2. Install Node ${nodeVersion} via NVM:`), chalk.yellow(`nvm install ${nodeVersion}\n`));
        throw new Error();
      }
      if (results.isSatisfied) {
        if (!instance.options.displayNoMessage) {
          instance.log(`Your Node versions is ${currentNodeVersion} (NMP: ${currentNpmVersion}).` + chalk.green(` Required Node version is ${nodeVersion} (NPM: ${npmVersion}).\n`));
        }
        resolve(null);
      }
    }
    resolve(null);
  }
}

module.exports = {
  printVersionNumber: rememberedVersionNumber()
};
