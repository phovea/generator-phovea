'use strict';
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const nvm = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.nvmrc'), 'utf8'));

function rememberedVersionNumber() {
  let versionHasBeenShown = false;
  return (results, resolve, instance) => {
    const currentVersion = parseFloat(results.versions.node.version.version);
    if (!versionHasBeenShown) {
      versionHasBeenShown = true;
      if (!results.isSatisfied) {
        if (currentVersion > nvm) {
          resolve('\nWarnings: \n' + chalk.yellow(`Your Node version is ${currentVersion}. Required Node version is ${nvm}.\n`));
          return
        }
        instance.log(chalk.red(`\nYour Node versions is ${currentVersion}. Required Node version is ${nvm}.\n`));
        instance.log('\nTo update:\n')
        instance.log(chalk.green('1. Install Node Version Manager (NVM):'), chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script'));
        instance.log(chalk.green(`2. Install Node ${nvm} via NVM:`), chalk.yellow(`nvm install ${nvm}\n`))
        throw new Error();
      }
      if (results.isSatisfied) {
        if (!instance.options.displayNoMessage) {
          instance.log(`Your Node versions is ${currentVersion}.` + chalk.green(` Required Node version is ${nvm}.\n`));
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
