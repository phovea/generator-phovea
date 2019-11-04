'use strict';
const generators = require('yeoman-generator');
const check = require("check-node-version");
const path = require('path');
const fs = require('fs');
const nvm = parseInt(fs.readFileSync(path.resolve(__dirname, '../../.nvmrc'), 'utf8'))
const chalk = require('chalk');

class NodeVersionGenerator extends generators.Base {
  constructor(args, options) {
    super(args, options);
  }
  async initializing() {
    return new Promise((resolve, reject) => {
      check({
          node: nvm
        },
        (error, results) => {
          if (error) {
            reject(error);
            return;
          }
          const currentVersion = parseInt(results.versions.node.version.version)
          if (!results.isSatisfied) {
            if (currentVersion > parseInt(nvm)) {
              this.log(chalk.yellow(`Your Node versions is ${currentVersion}. Required Node version is ${nvm}.\n`));
              resolve(results);
              return
            }
            this.log(chalk.red(`Your Node versions is ${currentVersion}. Required Node version is ${nvm}.\n`));
            this.log('\nTo update:')
            this.log(chalk.green('1. Install Node Version Manager (NVM):'), chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script'));
            this.log(chalk.green(`2. Install Node ${nvm} via NVM:`), chalk.yellow(`nvm install ${nvm}`))
          }
          if (results.isSatisfied) {
            if (!this.options.displayNoMessage) {
              this.log(`Your Node versions is ${currentVersion}.` + chalk.green(` Required Node version is ${nvm}.\n`));
            }
            resolve(results);
          }
        }
      );
    });
  }
}
module.exports = NodeVersionGenerator
