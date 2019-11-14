'use strict';
const BasePluginGenerator = require('../../utils').BasePython;
const fs = require('fs');

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    super.initializing();
  }

  default() {
    return super.default();
  }

  writing() {
    super.writing();
    if (!fs.existsSync(this.destinationPath(this.config.get('name') + '/config.json'))) {
      this.fs.writeJSON(this.destinationPath(this.config.get('name') + '/config.json'), {});
    }
  }
}

module.exports = PluginGenerator;

