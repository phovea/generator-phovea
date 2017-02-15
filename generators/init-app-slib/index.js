'use strict';
const BaseHybrid = require('../../utils').BaseHybrid;

class PluginGenerator extends BaseHybrid {

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
