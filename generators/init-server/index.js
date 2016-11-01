'use strict';
var BasePluginGenerator = require('../../utils').BasePython;

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    // since just last in the hierarchy used, need to do super calls
    super.initializing();
  }

  default() {
    return super.default();
  }

  writing() {
    super.writing();
    this.fs.extendJSON(this.destinationPath(this.config.get('name')+'/config.json'), {});
  }
}

module.exports = PluginGenerator;

