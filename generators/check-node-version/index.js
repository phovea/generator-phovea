'use strict';
const Base = require('yeoman-generator')
const chalk = require('chalk');
const check = require('check-node-version');

/**
 * Check if the required node version is installed. Otherwise terminate the generator.
 */
class Generator extends Base {

  end() {
    check(
      {
        node: '>= 18.3'
      },
      (error, results) => {
        if (error) {
          this.log(chalk.red(error));
          return -1;
        }

        if (results.isSatisfied) {
          this.log('All is well.');
          return 0;
        }

        this.log(chalk.red('Some package version(s) failed!'));

        for (const packageName of Object.keys(results.versions)) {
          if (!results.versions[packageName].isSatisfied) {
            this.log(`Missing ${packageName}.`);
          }
        }
      }
    );
  }
}

module.exports = Generator;
