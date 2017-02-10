'use strict';
const BasePluginGenerator = require('../../utils').BasePython;

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    this.config.defaults({
      sextensions: [{
        type: 'namespace',
        id: 'hello_world',
        module: 'hello_world',
        extras: {
          namespace: '/api/hello_world'
        }
      }]
    });
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

