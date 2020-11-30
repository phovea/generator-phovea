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
    const config = this.config.getAll();
    const cwd = this.destinationPath(this._isWorkspace() ? (config.app || config.serviceName || config.name) + '/' + config.name.toLowerCase() : config.name);
    if (!fs.existsSync(cwd + '/config.json')) {
      this._createSubDir(cwd);
      this.fs.writeJSON(cwd + '/config.json', {});
    }
  }
}

module.exports = PluginGenerator;

