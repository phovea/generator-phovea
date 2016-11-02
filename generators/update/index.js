'use strict';
const Base = require('yeoman-generator').Base;
const {extractFromReadme} = require('../migrate');

class Generator extends Base {

  initializing() {
    const pkg = this.fs.readJSON(this.destinationPath('package.json'));

    const {longDescription, readme} = extractFromReadme(this.fs.read(this.destinationPath('README.md')));

    this.props = {
      useDefaults: true,
      noSamples: true,
      description: (pkg.description || ''),
      longDescription: longDescription,
      readme: readme
    };
  }

  default() {
    const type = this.config.get('type');
    this.composeWith(`phovea:init-${type}`, {
      options: this.props
    }, {
      local: require.resolve(`../init-${type}`)
    });
  }
}

module.exports = Generator;
