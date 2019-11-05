'use strict';
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const nodeVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.nvmrc'), 'utf8'));
const npmVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.npm-version'), 'utf8'));
function rememberedVersionNumber() {
  let versionHasBeenShown = false;
  return (error, results, resolve) => {
    // console.log(results, results.versions.node.version, results.versions.npm.version);
    // console.log('-----------------');
    // console.log(results.versions.node.version);
    // console.log('-----------------');
    // console.log(results.versions.npm.version);
    if (error) {
      throw new Error(error);
    }
    const currentNodeVersion = parseFloat(results.versions.node.version.version);
    const currentNpmVersion = parseFloat(results.versions.npm.version.version);
    if (!versionHasBeenShown) {
      versionHasBeenShown = true;
      if (!results.isSatisfied) {
        if (currentNodeVersion > nodeVersion && currentNpmVersion > npmVersion) {
          return resolve('\nWarnings: \n' + chalk.yellow(`Your Node.js version is ${currentNodeVersion} (npm: ${currentNpmVersion}). Required Node.js version is ${nodeVersion} (npm: ${npmVersion}).\n`));
        }
        throw new Error(
          chalk.red(`\nYour Node.js version is ${currentNodeVersion} (npm: ${currentNpmVersion}). Required Node.js version is ${nodeVersion} (npm: ${npmVersion}).`) +
          '\nTo update:\n' +
          chalk.green('1. Install Node.js Version Manager (NVM): ') + chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script') +
          chalk.green(`\n2. Install Node.js ${nodeVersion} via NVM: `) + chalk.yellow(`nvm install ${nodeVersion}\n`)
        );
      }
      if (results.isSatisfied) {
        return resolve(`\nYour Node.js version is ${currentNodeVersion} (npm: ${currentNpmVersion}).` + chalk.green(` Required Node.js version is ${nodeVersion} (npm: ${npmVersion}).\n`));
      }
    }
    resolve(null);
  };
}

module.exports = {
  printVersionNumber: rememberedVersionNumber()
};
