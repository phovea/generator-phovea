'use strict';
var BasePluginGenerator = require('../../utils').BasePython;

class PluginGenerator extends BasePluginGenerator {

  initializing() {
    // since just last in the hierarchy used, need to do super calls
    super.initializing();

    this.config.defaults({
      sextensions: [{
        type: 'namespace',
        id: 'hello_world_namespace',
        module: 'hello_world',
        extras: {
          namespace: '/api/hello_world'
        }
      }]
    });
  }

  default() {
    return super.default();
  }

  writing() {
    return super.writing();
  }
}

module.exports = PluginGenerator;
