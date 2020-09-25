'use strict';

const BaseInitHybridGenerator = require("../init-lib-service");

class PluginGenerator extends BaseInitHybridGenerator {

  initializing() {
    super.initializing();
    this.config.defaults({
      modules: ['phovea_core', 'phovea_ui', 'phovea_server'],
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
