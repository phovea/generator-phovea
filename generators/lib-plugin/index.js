'use strict';
var BasePluginGenerator = require('../../utils').Base;

class PluginGenerator extends BasePluginGenerator {

  constructor(args, options) {
    super('library', args, options);
  }

  initializing() {
    //since just last in the hierarchy used, need to do super calls
    super.initializing();
  }

  prompting() {
    super.prompting();
  }

  default() {
    super.default();
  }

  writing() {
    super.writing();
  }
}

module.exports = PluginGenerator;
