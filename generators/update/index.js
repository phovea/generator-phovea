'use strict';
const Base = require('yeoman-generator').Base;

class Generator extends Base {

  default() {
    const type = this.config.get('type');
    this.composeWith(`phovea:init-${type}`, {
      options: {
        useDefaults: true,
        noSamples: true
      }
    }, {
      local: require.resolve(`../init-${type}`)
    });
  }
}

module.exports = Generator;
