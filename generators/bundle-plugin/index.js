'use strict';
var BasePluginGenerator = require('../../utils').Base;

class PluginGenerator extends BasePluginGenerator {

  constructor(args, options) {
    super('bundle', args, options);
  }

  initializing() {
    // since just last in the hierarchy used, need to do super calls
    return super.initializing();
  }

  prompting() {
    return super.prompting();
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

module.exports = PluginGenerator;
