'use strict';
const Base = require('../../utils').Base;

class Generator extends Base {

  initializing() {
    this.config.defaults({
      modules: ['phovea_server', 'phovea_core']
    });
  }

  default() {
    this.composeWith('phovea:_node', {
      options: this.options
    }, {
      local: require.resolve('../_node')
    });
    const types = this.config.get('type').split('-');
    this.composeWith('phovea:init-' + types[1], {
      options: this.options
    }, {
      local: require.resolve('../init-' + types[1])
    });
    this.composeWith('phovea:init-' + types[0], {
      options: this.options
    }, {
      local: require.resolve('../init-' + types[0])
    });
  }

  end() {
    // ensure later than the others
    return super.writing();
  }
}

module.exports = Generator;
