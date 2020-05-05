'use strict';
const BasePluginGenerator = require('../../utils').Base;
const chalk = require('chalk');
class PluginGenerator extends BasePluginGenerator {

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
    this.log('\n\nnext steps: ');
    this.log(chalk.yellow(' npm install'));
    this.log(chalk.yellow(` npm build`));
  }
}

module.exports = PluginGenerator;
