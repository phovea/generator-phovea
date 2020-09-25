'use strict';
const fs = require('fs');
const BaseInitServerGenerator = require('../../base/BaseInitServerGenerator');

class PluginGenerator extends BaseInitServerGenerator {

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

