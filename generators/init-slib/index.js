'use strict';
const BasePluginGenerator = require('../../utils').BasePython;

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    super.initializing();
  }

  default() {
    return super.default();
  }

  writing() {
    super.writing();
    if (!this.fs.exists(this.destinationPath(this.config.get('name') + '/config.json'))) {
      this.fs.writeJSON(this.destinationPath(this.config.get('name') + '/config.json'), {});
    }
  }
}

module.exports = PluginGenerator;

