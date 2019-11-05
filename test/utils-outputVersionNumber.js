'use-strict';
const outputVersionNumber = require('../utils/outputVersionNumber').printVersionNumber;
const assert = require('yeoman-assert');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const resolve = (a) => a;
const nodeVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.nvmrc'), 'utf8'));
const npmVersion = parseFloat(fs.readFileSync(path.resolve(__dirname, '../.npm-version'), 'utf8'));
const results = {
  versions:
  {
    node: {
      isSatisfied: false,
      version: {
        version: nodeVersion
      }
    },
    npm: {
      isSatisfied: true,
      version: {
        version: npmVersion
      }
    },
    isSatisfied: false
  }
};

describe('outputVersionNumber() behaves as expected', () => {
  it('throws an error when error is defined', () => {
    try {
      outputVersionNumber('error', results, resolve);
    } catch (error) {
      assert.equal(error.message, 'error');
    }
  });

  it('throws an error when local node version is lower than required', () => {
    results.versions.node.version.version = 6;
    results.versions.npm.version.version = 6.4;
    const expectedOutput = chalk.red(`\nYour Node.js version is 6 (npm: 6.4). Required Node.js version is ${nodeVersion} (npm: ${npmVersion}).`) +
      '\nTo update:\n' +
      chalk.green('1. Install Node.js Version Manager (NVM): ') + chalk.yellow('https://github.com/nvm-sh/nvm#install--update-script') +
      chalk.green(`\n2. Install Node.js ${nodeVersion} via NVM: `) + chalk.yellow(`nvm install ${nodeVersion}\n`);
    try {
      outputVersionNumber(null, results, resolve);
    } catch (error) {
      assert.equal(error.message, expectedOutput);
    }
  });
});
