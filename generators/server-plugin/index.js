'use strict';
var BasePluginGenerator = require('../../utils').Base;

class PluginGenerator extends BasePluginGenerator {

  constructor(args, options) {
    super('server', args, options, 'python');
  }

  initializing() {
    //since just last in the hierarchy used, need to do super calls
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
