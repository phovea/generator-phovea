'use strict';
const Base = require('../../utils').Base;

class Generator extends Base {
  default() {
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
