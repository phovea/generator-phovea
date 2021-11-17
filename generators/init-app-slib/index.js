'use strict';

const BaseInitHybridGenerator = require('../init-lib-service');

class PluginGenerator extends BaseInitHybridGenerator {

  initializing() {
    super.initializing();
    this.config.defaults({
      modules: ['tdp_core', 'phovea_server'],
      libraries: ['d3']
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
