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
    return super.prompting();
  }

  default () {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

module.exports = PluginGenerator;
