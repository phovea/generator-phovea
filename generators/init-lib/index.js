'use strict';
const chalk = require('chalk');
const BaseInitPluginGenerator = require('../../base/BaseInitPluginGenerator');
class PluginGenerator extends BaseInitPluginGenerator {

  initializing() {
    return super.initializing();
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }

  end() {
    if (!this._isWorkspace()) {
      return;
    }
    this.log('\n\nNext steps: ');
    this.log(chalk.yellow(' npm install'));
    this.log(chalk.yellow(` npm build`));
  }
}

module.exports = PluginGenerator;
