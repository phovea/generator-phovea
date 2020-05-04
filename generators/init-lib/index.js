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
}

module.exports = PluginGenerator;
